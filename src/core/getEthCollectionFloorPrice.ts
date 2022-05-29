import _ from 'lodash'
import appConf from '../app.conf'
import { findOne as findOneCollection } from '../db/collections'
import Blockchain from '../entities/lib/Blockchain'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import Value, { $ETH } from '../entities/lib/Value'
import failure from '../utils/failure'
import getRequest from '../utils/getRequest'
import logger from '../utils/logger'

type Params = {
  blockchain: Blockchain<'ethereum'>
  collectionAddress: string
}

export default async function getEthCollectionFloorPrice({ blockchain, collectionAddress }: Params): Promise<Value<'ETH'>> {
  logger.info(`Fetching floor price for Ethereum collection <${collectionAddress}>...`)

  const apiKey = appConf.nftbankAPIKey
  if (!apiKey) throw failure('MISSING_API_KEY')

  switch (blockchain.networkId) {
  case EthereumNetwork.MAIN:
    const res = await getRequest(`https://api.nftbank.ai/estimates-v2/floor_price/${collectionAddress}`, {
      headers: {
        'accept': 'application/json',
        'X-API-Key': apiKey,
      },
      params: {
        'chain_id': 'ETHEREUM',
      },
    })

    const floorPrices = _.get(res, 'data.0.floor_price')
    const floorPrice = _.get(_.find(floorPrices, { 'currency_symbol': 'ETH' }), 'floor_price')
    if (!floorPrice) throw failure('FETCH_FLOOR_PRICE')

    return $ETH(floorPrice)
  case EthereumNetwork.RINKEBY:
    const collection = await findOneCollection({ blockchain, address: collectionAddress })
    if (collection?.id === 'testing2') return $ETH(1)
    else if (collection?.id === 'testing' || collection?.id === 'testing3') return $ETH(0.1)
    throw failure('UNSUPPORTED_COLLECTION')
  default:
    throw failure('UNSUPPORTED_NETWORK')
  }
}
