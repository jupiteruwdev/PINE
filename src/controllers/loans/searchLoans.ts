import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { Blockchain, Collection, Loan, NFT, Value } from '../../entities'
import { getOnChainLoans } from '../../subgraph'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getEthNFTMetadata } from '../collaterals'
import { getCollections, getEthCollectionMetadata } from '../collections'
import DataSource from '../utils/DataSource'

export enum LoanSortType {
  POOL_ADDRESS = 'poolAddress',
  COLLECTION_ADDRESS = 'collectionAddress',
  COLLECTION_NAME = 'collectionName'
}

export enum LoanSortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

type Params = {
  lenderAddresses?: string[]
  collectionAddresses?: string[]
  collectionNames?: string[]
  blockchain: Blockchain
  sortBy?: {
    type: LoanSortType
    direction: LoanSortDirection
  }
  paginateBy?: {
    count: number
    offset: number
  }
}

function useGraph({ blockchain, lenderAddresses, collectionAddresses, sortBy, paginateBy }: Params): DataSource<Loan[]> {
  return async () => {
    const onChainLoans = await getOnChainLoans({
      lenderAddresses,
      collectionAddresses,
      sortBy,
      paginateBy,
    }, {
      networkId: blockchain.networkId,
    })

    const loans = onChainLoans.map(loan => {
      const nftId = loan.id.split('/')[1]

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
            address: loan.erc721,
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

export default async function searchLoans({
  blockchain,
  lenderAddresses,
  collectionAddresses,
  collectionNames,
  sortBy,
  paginateBy,
}: Params): Promise<Loan[]> {
  logger.info(`Searching loans for collection addresses <${collectionAddresses?.join(',')}>, lender addresses<${lenderAddresses?.join(',')}>, collection names <${collectionNames?.join(',')} and blockchain <${JSON.stringify(blockchain)}>...`)

  try {
    switch (blockchain.network) {
    case 'ethereum':
      let allCollectionAddresses: string[] = []
      if (collectionNames !== undefined) {
        const collectionsByNames = await getCollections({ blockchainFilter: {
          ethereum: blockchain.networkId,
        }, collectionNames })
        allCollectionAddresses = collectionsByNames.map(collection => collection.address.toLowerCase())
      }
      if (collectionAddresses !== undefined) {
        allCollectionAddresses = [
          ...allCollectionAddresses,
          ...collectionAddresses.map(address => address.toLowerCase()),
        ]
      }
      const dataSource = DataSource.compose(useGraph({ blockchain, collectionAddresses: allCollectionAddresses, lenderAddresses, sortBy, paginateBy }))
      let loans = await dataSource.apply(undefined)

      const uniqCollectionAddresses = _.uniq(loans.map(loan => loan.nft.collection.address.toLowerCase()))

      const [allCollectionMetadata, allNFTMetadata] = await Promise.all([
        Promise.all(uniqCollectionAddresses.map(async address => ({
          [address]: await getEthCollectionMetadata({ blockchain, collectionAddress: address.toLowerCase() }),
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

      logger.info(`Searching loans for collection addresses <${collectionAddresses?.join(',')}>, lender addresses<${lenderAddresses?.join(',')}>, collection names <${collectionNames?.join(',')} and blockchain <${JSON.stringify(blockchain)}>... OK`)

      return loans
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }
  }
  catch (err) {
    logger.error(`Searching loans for collection addresses <${collectionAddresses?.join(',')}>, lender addresses<${lenderAddresses?.join(',')}>, collection names <${collectionNames?.join(',')} and blockchain <${JSON.stringify(blockchain)}>... ERR:`, err)
    throw err
  }
}
