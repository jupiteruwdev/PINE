import axios from 'axios'
import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Valuation, Value } from '../../entities'
import fault from '../../utils/fault'
import { getCollection } from '../collections'

type Params = {
  blockchainFilter: Blockchain.Filter
  collectionAddresses: string[]
}

export default async function getEthCollectionFloorPriceBatch({ blockchainFilter, collectionAddresses }: Params): Promise<Valuation[]> {
  const apiKey = appConf.nftbankAPIKey
  if (!apiKey) throw fault('ERR_MISSING_API_KEY', 'Missing NFTBank API key')
  if (!!blockchainFilter.ethereum && !!blockchainFilter.solana) throw fault('ERR_AMBIGUIOUS_BLOCKCHAIN')

  switch (blockchainFilter.ethereum) {
  case Blockchain.Ethereum.Network.MAIN:
    const { data: res } = await axios.post('https://api.nftbank.ai/estimates-v2/floor_price/bulk',
      {
        'chain_id': 'ETHEREUM',
        'asset_contracts': collectionAddresses,
      },
      {
        headers: {
          'accept': 'application/json',
          'X-API-Key': apiKey,
        },
      },
    )

    const floorPriceEntities = _.get(res, 'data')
    const floorPrices = floorPriceEntities.map(async (floorPriceEntity: any) => {
      const floorPrices = _.get(floorPriceEntity, 'floor_price')
      const collectionAddress = _.get(floorPriceEntity, 'asset_info.contract_address')
      const collectionName = _.get(floorPriceEntity, 'asset_info.name')
      return {
        collection: await getCollection({ blockchain: { network: 'ethereum', networkId: Blockchain.Ethereum.Network.MAIN }, address: collectionAddress }) ?? {
          address: collectionAddress,
          name: collectionName,
          blockchain: { network: 'ethereum', networkId: Blockchain.Ethereum.Network.MAIN },
        },
        value1DReference: Value.$ETH(_.get(_.find(floorPrices, { 'currency_symbol': 'ETH' }), 'floor_price')),
      }
    })

    if (!floorPrices) throw fault('ERR_FETCH_FLOOR_PRICES')

    return Promise.all(floorPrices)
  case Blockchain.Ethereum.Network.RINKEBY:
    const floorPricesRinkeby = []
    for (const collectionAddress of collectionAddresses) {
      const collection = await getCollection({ blockchain: { network: 'ethereum', networkId: Blockchain.Ethereum.Network.RINKEBY }, address: collectionAddress })
      const id = _.values(collection?.vendorIds)?.[0]

      let floorPriceRinkeby
      if (id === 'testing2') floorPriceRinkeby = Value.$ETH(1)
      else if (id === 'testing' || id === 'testing3') floorPriceRinkeby = Value.$ETH(0.1)
      else throw fault('ERR_UNSUPPORTED_COLLECTION')
      floorPricesRinkeby.push({
        collection: collection ?? {
          address: collectionAddress,
          blockchain: { network: 'ethereum', networkId: Blockchain.Ethereum.Network.RINKEBY },
        },
        value1DReference: floorPriceRinkeby,
      })
    }
    return floorPricesRinkeby
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}
