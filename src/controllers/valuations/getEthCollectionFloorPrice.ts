import _ from 'lodash'
import appConf from '../../app.conf'
import { findOneCollection } from '../../db'
import { Blockchain, Value } from '../../entities'
import fault from '../../utils/fault'
import getRequest from '../../utils/getRequest'

type Params = {
  blockchain: Blockchain<'ethereum'>
  collectionAddress: string
}

export default async function getEthCollectionFloorPrice({ blockchain, collectionAddress }: Params): Promise<Value<'ETH'>> {
  const apiKey = appConf.nftbankAPIKey
  if (!apiKey) throw fault('ERR_MISSING_API_KEY', 'Missing NFTBank API key')

  switch (blockchain.networkId) {
  case Blockchain.Ethereum.Network.MAIN:
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
    if (!floorPrice) throw fault('ERR_FETCH_FLOOR_PRICE')

    return Value.$ETH(floorPrice)
  case Blockchain.Ethereum.Network.RINKEBY:
    const collection = await findOneCollection({ blockchain, address: collectionAddress })
    if (collection?.id.includes('testing2')) return Value.$ETH(1)
    else if (collection?.id.includes('testing') || collection?.id.includes('testing3')) return Value.$ETH(0.1)
    throw fault('ERR_UNSUPPORTED_COLLECTION')
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}
