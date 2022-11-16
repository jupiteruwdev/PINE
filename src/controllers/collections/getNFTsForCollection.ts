import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Collection, NFT } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import postRequest from '../utils/postRequest'

interface Params {
  blockchain: Blockchain
  collectionAddress: string
  paginateBy?: {
    count: number
    offset: number
  }
}

export default async function getNFTsForCollection({ blockchain, collectionAddress, paginateBy }: Params): Promise<any> {
  try {
    logger.info(`Fetching nfts for collection <${collectionAddress}> on network <${blockchain.networkId}>...`)
    const apiKey = appConf.gemxyzAPIKey

    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
      const nftsData = await postRequest('https://gem-public-api-v2.herokuapp.com/assets',
        {
          filters: {
            address: collectionAddress,
          },
          limit: paginateBy?.count,
          offset: paginateBy?.offset,
          fields: {
            id: 1,
            name: 1,
            address: 1,
            description: 1,
            collectionName: 1,
            collectionSymbol: 1,
            externalLink: 1,
            imageUrl: 1,
            smallImageUrl: 1,
            animationUrl: 1,
            tokenMetadata: 1,
            standard: 1,
            decimals: 1,
            traits: 1,
            creator: 1,
            owner: 1,
            market: 1,
            currentBasePrice: 1,
            currentEthPrice: 1,
            currentUsdPrice: 1,
            paymentToken: 1,
            marketUrl: 1,
            marketplace: 1,
            tokenId: 1,
            priceInfo: 1,
            url: 1,
          },
        },
        {
          headers: {
            'X-API-KEY': apiKey,
          },
          timeout: 10000,
        }
      )
      const nfts = _.get(nftsData, 'data')
      return nfts.map((nft: any) => NFT.factory({
        id: _.get(nft, 'id'),
        name: _.get(nft, 'name'),
        imageUrl: _.get(nft, 'imageUrl'),
        ownerAddress: _.get(nft, 'owner'),
        collection: Collection.factory({
          address: collectionAddress,
          name: _.get(nft, 'collectionName'),
          blockchain,
        }),
      }))
    default:
      const err = fault('ERR_UNSUPPORTED_BLOCKCHAIN')
      logger.error(`Fetching nfts for collection <${collectionAddress}>... ERR:`, err)
      throw err
    }
  }
  catch (err) {
    logger.error(`Fetching nfts for collection <${collectionAddress}> on network <${blockchain.networkId}>... ERR`)
    if (logger.isErrorEnabled() && !logger.silent) console.error(err)
    throw fault('ERR_FETCH_NFTS_FOR_COLLECTION', undefined, err)
  }
}
