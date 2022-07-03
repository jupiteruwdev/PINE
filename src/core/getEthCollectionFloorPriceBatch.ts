import axios from 'axios'
import _ from 'lodash'
import appConf from '../app.conf'
import { findOneCollection } from '../db'
import { Blockchain, Valuation, Value } from '../entities'
import failure from '../utils/failure'

type Params = {
  blockchainFilter: Blockchain.Filter
  collectionAddresses: string[]
}

export default async function getEthCollectionFloorPriceBatch({ blockchainFilter, collectionAddresses }: Params): Promise<Valuation[]> {
  const apiKey = appConf.nftbankAPIKey
  if (!apiKey) throw failure('ERR_MISSING_API_KEY', 'Missing NFTBank API key')
  if (!!blockchainFilter.ethereum && !!blockchainFilter.solana) throw failure('ERR_AMBIGUIOUS_BLOCKCHAIN')

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
        collection: await findOneCollection({ blockchain: { network: 'ethereum', networkId: Blockchain.Ethereum.Network.MAIN }, address: collectionAddress }) ?? {
          address: collectionAddress,
          name: collectionName,
          id: '',
          blockchain: { network: 'ethereum', networkId: Blockchain.Ethereum.Network.MAIN },
        },
        value1DReference: Value.$ETH(_.get(_.find(floorPrices, { 'currency_symbol': 'ETH' }), 'floor_price')),
      }
    })

    if (!floorPrices) throw failure('ERR_FETCH_FLOOR_PRICES')

    return Promise.all(floorPrices)
  case Blockchain.Ethereum.Network.RINKEBY:
    const floorPricesRinkeby = []
    for (const collectionAddress of collectionAddresses) {
      const collection = await findOneCollection({ blockchain: { network: 'ethereum', networkId: Blockchain.Ethereum.Network.RINKEBY }, address: collectionAddress })
      let floorPriceRinkeby
      if (collection?.id === 'testing:testing2') floorPriceRinkeby = Value.$ETH(1)
      else if (collection?.id === 'testing:testing' || collection?.id === 'testing:testing3') floorPriceRinkeby = Value.$ETH(0.1)
      else throw failure('ERR_UNSUPPORTED_COLLECTION')
      floorPricesRinkeby.push({
        collection,
        value1DReference: floorPriceRinkeby,
      })
    }
    return floorPricesRinkeby
  default:
    throw failure('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}
