import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { Blockchain, Collection, Loan, NFT, Pool, Value } from '../../entities'
import { getOnChainLoans } from '../../subgraph'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getEthNFTMetadata } from '../collaterals'
import { getEthCollectionMetadata } from '../collections'
import { searchPublishedPools } from '../pools'
import DataSource from '../utils/DataSource'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  populateMetadata?: boolean
}

export default async function getLoansByCollection({
  blockchain,
  collectionAddress,
  populateMetadata = false,
}: Params): Promise<Loan[]> {
  try {
    logger.info(`Fetching loans by collection <${collectionAddress}> on blockchain <${JSON.stringify(blockchain)}>...`)

    let loans = await DataSource.fetch(useGraph({ blockchain, collectionAddress }))
    let sortedLoans: Loan[] = []

    if (populateMetadata === true) {
      const uniqCollectionAddresses = _.uniq(loans.map(loan => loan.nft.collection.address.toLowerCase()))
      const [allCollectionMetadata, allNFTMetadata] = await Promise.all([
        Promise.all(uniqCollectionAddresses.map(async address => ({
          [address]: await getEthCollectionMetadata({ blockchain, collectionAddress: address }),
        }))),
        Promise.all(loans.map(loan => getEthNFTMetadata({
          blockchain,
          collectionAddress: loan.nft.collection.address,
          nftId: loan.nft.id,
        }))),
      ])

      const collectionMetadataDict = allCollectionMetadata.reduce((prev, curr) => ({ ...prev, ...curr }), {})

      loans = loans.map((loan, idx) => {
        const collectionMetadata = collectionMetadataDict[loan.nft.collection.address.toLowerCase()]
        const nftMetadata = allNFTMetadata[idx]

        return {
          ...loan,
          nft: {
            ...loan.nft,
            ...nftMetadata,
            collection: {
              ...loan.nft.collection,
              ...collectionMetadata ?? {},
            },
          },
        }
      })

      sortedLoans = _.sortBy(loans, [
        loan => loan.nft.collection.isSupported !== true,
        loan => loan.nft.collection.name?.toLowerCase(),
      ])
    }
    else {
      sortedLoans = _.sortBy(loans, [
        loan => loan.nft.collection.address.toLowerCase(),
      ])
    }

    logger.info(`Fetching loans by collection <${collectionAddress}> on blockchain <${JSON.stringify(blockchain)}>... OK: Found ${sortedLoans.length} result(s)`)
    logger.debug(JSON.stringify(sortedLoans, undefined, 2))

    return sortedLoans
  }
  catch (err) {
    logger.error(`Fetching loans by collection <${collectionAddress}> on blockchain <${JSON.stringify(blockchain)}>... ERR`)
    if (logger.isErrorEnabled() && !logger.silent) console.error(err)

    throw fault('ERR_GET_LOANS_BY_COLLECTION', undefined, err)
  }
}

export function useGraph({ blockchain, collectionAddress }: Params): DataSource<Loan[]> {
  return async () => {
    const pools = await searchPublishedPools({ collectionAddress, blockchainFilter: { [blockchain.network]: blockchain.networkId } }) as Pool[]
    const poolAddresses = pools.map(pool => pool.address)
    const onChainLoans = await getOnChainLoans({ poolAddresses }, { networkId: blockchain.networkId })

    const loans = onChainLoans.map(loan => {
      const collectionAddress = loan.id.split('/')[0] ?? ''
      const nftId = loan.id.split('/')[1] ?? ''

      return Loan.factory({
        accuredInterest: Value.$WEI(loan.accuredInterestWei),
        borrowed: Value.$ETH(loan.borrowedWei),
        borrowerAddress: loan.borrower,
        expiresAt: new Date(_.toNumber(loan.loanExpiretimestamp) * 1000),
        interestBPSPerBlock: new BigNumber(loan.interestBPS1000000XBlock).dividedBy(1_000_000),
        loanStartBlock: loan.loanStartBlock,
        maxLTVBPS: new BigNumber(loan.maxLTVBPS),
        nft: NFT.factory({
          collection: Collection.factory({
            address: collectionAddress,
            blockchain,
          }),
          id: nftId,
        }),
        poolAddress: loan.pool,
        repaidInterest: Value.$WEI(loan.repaidInterestWei),
        returned: Value.$WEI(loan.returnedWei),
      })
    })

    return loans
  }
}
