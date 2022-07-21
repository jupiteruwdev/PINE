import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import getRequest from '../utils/getRequest'

type Params = {
  collectionAddress: string
  blockchain: Blockchain
}

export default async function getVendorIdsByCollection({ collectionAddress, blockchain }: Params): Promise<Record<string, any> | undefined> {
  logger.info(`Fetching vendor ids for Ethereum collection <${collectionAddress}>...`)
  let collectionData; let collectionSlug
  const apiKey = appConf.openseaAPIKey

  switch (blockchain.networkId) {
  case Blockchain.Ethereum.Network.MAIN:
    collectionData = await getRequest(`https://api.opensea.io/api/v1/asset_contract/${collectionAddress}`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    })
    collectionSlug = _.get(collectionData, 'collection.slug')
    return {
      opensea: collectionSlug,
    }
  case Blockchain.Ethereum.Network.RINKEBY:
    collectionData = await getRequest(`https://testnets-api.opensea.io/api/v1/asset_contract/${collectionAddress}`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    })
    collectionSlug = _.get(collectionData, 'collection.slug')
    return {
      opensea: collectionSlug,
    }
  default:
    const err = fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    logger.error(`Fetching vendor ids for Ethereum collection <${collectionAddress}>... ERR:`, err)
    throw err
  }
}
