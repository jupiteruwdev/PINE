import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Collection, Value } from '../../entities'
import NFTSale from '../../entities/lib/NFTSale'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import postRequest from '../utils/postRequest'

import { ethers } from 'ethers'
import { NFTCollectionModel } from '../../database'
import DataSource from '../utils/DataSource'
import { useReservoirCollections } from '../utils/useReservoirAPI'
import { getCollectionValuation } from '../valuations'
import getCollections from './getCollections'
import getNFTSales from './getNFTSales'

type Params = {
  query?: string
  blockchain?: Blockchain
}

async function aggregateCollectionResults(collections: Collection[], blockchain: Blockchain): Promise<Collection[]> {
  try {
    const addresses = collections.map(collection => collection.address.toLowerCase())
    const dbCollections = await NFTCollectionModel.find({ address: {
      $in: addresses,
    } })

    const collectionResults = await Promise.all(
      collections.map(async (collection: Collection) => {
        const sales = await getNFTSales({ blockchain, contractAddress: collection.address })
        let floorPrice
        try {
          floorPrice = (await getCollectionValuation({ blockchain, collectionAddress: collection.address })).value
        }
        catch (err) {
          floorPrice = Value.$ETH(0)
        }
        const dbCollection = dbCollections.find(c => c.address?.toLowerCase() === collection.address.toLowerCase())

        return {
          ...collection,
          ...dbCollection ? { imageUrl: dbCollection.imageUrl, name: dbCollection.displayName, verified: dbCollection.verified } : {},
          sales: sales.map((sale: any) => NFTSale.factory({
            marketplace: _.get(sale, 'orderSource'),
            collectionAddress: collection.address,
            buyerAddress: _.get(sale, 'to'),
            sellerAddress: _.get(sale, 'from'),
            nftId: _.get(sale, 'token.tokenId'),
            transactionHash: _.get(sale, 'txHash'),
            quantity: _.get(sale, 'amount'),
          })),
          floorPrice,
        }
      }),
    )

    return collectionResults
  }
  catch (err) {
    throw fault('ERR_SEARCH_COLLECTIONS_AGGREGATE_COLLECTIONS', undefined, err)
  }
}

export default async function searchCollections({ query, blockchain }: Params): Promise<Collection[]> {
  try {
    logger.info(`Fetching collection by search text <${query}>...`)

    if (!query) {
      const collections = await getCollections({ blockchainFilter: blockchain ? Blockchain.parseFilter(blockchain) : undefined, verifiedOnly: true })
      return collections
    }

    if (!ethers.utils.isAddress(query)) {
      const collections = await getCollections({ collectionNames: [query], blockchainFilter: blockchain ? Blockchain.parseFilter(blockchain) : undefined, verifiedOnly: true })
      return collections
    }

    const dbCollections = await getCollections({ collectionAddresses: [query], blockchainFilter: blockchain ? Blockchain.parseFilter(blockchain) : undefined })
    if (dbCollections.length) return dbCollections

    if (!blockchain) blockchain = Blockchain.Ethereum()

    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
      const collections = await DataSource.fetch(
        useReservoirContract({ query, blockchain }),
        useReservoir({ query, blockchain }),
        useGemXYZ({ query, blockchain }),
      )

      return aggregateCollectionResults(collections, blockchain)
    case Blockchain.Polygon.Network.MAIN:
    case Blockchain.Arbitrum.Network.MAINNET:
    case Blockchain.Avalanche.Network.MAINNET:
      const collectionsEVM = await DataSource.fetch(
        useReservoirContract({ query, blockchain }),
        useReservoir({ query, blockchain }),
        useGemXYZ({ query, blockchain }),
      )

      const evmContracts = await getCollections({ blockchainFilter: Blockchain.parseFilter(blockchain), verifiedOnly: false })

      return aggregateCollectionResults(collectionsEVM.filter(collection => evmContracts.find(con => con.address.toLowerCase() === collection.address.toLowerCase())), blockchain)
    case Blockchain.Ethereum.Network.GOERLI:
    case Blockchain.Polygon.Network.MUMBAI:
      const collectionsGoerli = await DataSource.fetch(
        useReservoirContract({ query, blockchain }),
        useReservoir({ query, blockchain }),
      )
      return collectionsGoerli
    default:
      const err = fault('ERR_UNSUPPORTED_BLOCKCHAIN')
      logger.error(`Fetching collection for search text <${query}>... ERR:`, err)
      throw err
    }
  }
  catch (err) {
    throw fault('ERR_SEARCH_COLLECTIONS', undefined, err)
  }
}

function useReservoir({ query, blockchain }: { query: string; blockchain: Blockchain }): DataSource<Collection[]> {
  return async () => {
    try {
      const collectionsInfo = await useReservoirCollections({ name: query, blockchain })

      return collectionsInfo.collections
        .filter((cd: any) => cd.contractKind === 'erc721' && cd.openseaVerificationStatus === 'verified')
        .map((cd: any) => Collection.factory({
          address: cd.primaryContract,
          blockchain,
          vendorIds: { opensea: cd.slug },
          name: cd.name,
          imageUrl: cd.image ?? '',
        }))
    }
    catch (err) {
      throw fault('ERR_SEARCH_COLLECTIONS_USE_RESERVOIR', undefined, err)
    }
  }
}

function useReservoirContract({ query, blockchain }: { query: string; blockchain: Blockchain }): DataSource<Collection[]> {
  return async () => {
    try {
      const collectionsInfo = await useReservoirCollections({ collectionAddresses: [query], blockchain })

      return collectionsInfo.collections.map((collection: any) => Collection.factory({
        address: collection.primaryContract,
        blockchain,
        vendorIds: { opensea: collection.slug },
        name: collection.name,
        imageUrl: collection.image ?? '',
      }))
    }
    catch (err) {
      throw fault('ERR_SEARCH_COLLECTIONS_USE_RESERVOIR_CONTRACT', undefined, err)
    }
  }
}

function useGemXYZ({ query, blockchain }: { query: string; blockchain: Blockchain }): DataSource<Collection[]> {
  return async () => {
    try {
      const apiKey = appConf.gemxyzAPIKey
      const collectionData = await postRequest('https://gem-public-api-v2.herokuapp.com/collections',
        {
          filters: { searchText: query },
          sort: { sevenDayVolume: -1 },
          limit: 10,
        },
        {
          headers: {
            'X-API-KEY': apiKey,
          },
          timeout: 10000,
        })
      const collections = _.get(collectionData, 'data')

      return collections.filter((cd: any) => cd.chainId === '1' && _.get(cd, 'addresses[0].address') && cd.name && cd.slug).map((cd: any) => Collection.factory({
        address: _.get(cd, 'addresses[0].address'),
        blockchain,
        vendorIds: { opensea: cd.slug },
        name: cd.name,
        imageUrl: cd.imageUrl ?? '',
      }))
    }
    catch (err) {
      throw fault('ERR_SEARCH_COLLECTIONS_USE_GEM_XYZ', undefined, err)
    }
  }
}
