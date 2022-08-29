import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { Blockchain, Collection, Loan, NFT, Value } from '../../entities'
import { getOnChainLoans } from '../../subgraph'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import { getEthNFTMetadata } from '../collaterals'
import { getEthCollectionMetadata } from '../collections'
import DataSource from '../utils/DataSource'

type Params = {
  blockchain: Blockchain
  borrowerAddress: string
  populateMetadata?: boolean
}

export default async function getLoansByBorrower({
  blockchain,
  borrowerAddress,
  populateMetadata = false,
}: Params): Promise<Loan[]> {
  try {
    logger.info(`Fetching loans by borrower <${borrowerAddress}> on blockchain <${JSON.stringify(blockchain)}>...`)

    let loans = await DataSource.fetch(useGraph({ blockchain, borrowerAddress }))
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

    logger.info(`Fetching loans by borrower <${borrowerAddress}> on blockchain <${JSON.stringify(blockchain)}>... OK: Found ${sortedLoans.length} result(s)`)
    logger.debug(JSON.stringify(sortedLoans, undefined, 2))

    return sortedLoans
  }
  catch (err) {
    logger.error(`Fetching loans by borrower <${borrowerAddress}> on blockchain <${JSON.stringify(blockchain)}>... ERR`)
    if (logger.isErrorEnabled() && !logger.silent) console.error(err)

    throw fault('ERR_GET_LOANS_BY_BORROWER', undefined, err)
  }
}

export function useGraph({ blockchain, borrowerAddress }: Params): DataSource<Loan[]> {
  return async () => {
    logger.info(`...using Graph to look up loans by borrower <${borrowerAddress}>`)

    if (blockchain.network !== 'ethereum') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    const onChainLoans = await getOnChainLoans({ borrowerAddress }, { networkId: blockchain.networkId })

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
