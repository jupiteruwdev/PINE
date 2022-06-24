import axios from 'axios'
import _ from 'lodash'
import appConf from '../app.conf'
import { findOne as findOneCollection } from '../db/collections'
import { $ETH, BlockchainFilter, EthereumNetwork } from '../entities'
import { Valuation } from '../entities/lib/Valuation'
import failure from '../utils/failure'
import logger from '../utils/logger'

type Params = {
  blockchainFilter: BlockchainFilter
  collectionAddresses: string[]
}

export default async function getEthCollectionFloorPriceBatch({ blockchainFilter, collectionAddresses }: Params): Promise<Valuation[]> {
  logger.info(`Fetching floor price for Ethereum collection <${collectionAddresses}>...`)

  const apiKey = appConf.nftbankAPIKey
  if (!apiKey) throw failure('MISSING_API_KEY')
  if (!!blockchainFilter.ethereum && !!blockchainFilter.solana) throw failure('AMBIGUIOUS BLOCKCHAIN')

  switch (blockchainFilter.ethereum) {
  case EthereumNetwork.MAIN:
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
        collection: await findOneCollection({ blockchain: { network: 'ethereum', networkId: EthereumNetwork.MAIN }, address: collectionAddress }) ?? {
          address: collectionAddress,
          name: collectionName,
          id: '',
          blockchain: { network: 'ethereum', networkId: EthereumNetwork.MAIN },
        },
        value1DReference: $ETH(_.get(_.find(floorPrices, { 'currency_symbol': 'ETH' }), 'floor_price')),
      }
    })

    if (!floorPrices) throw failure('FETCH_FLOOR_PRICE')

    return Promise.all(floorPrices)
  case EthereumNetwork.RINKEBY:
    const floorPricesRinkeby = []
    for (const collectionAddress of collectionAddresses) {
      const collection = await findOneCollection({ blockchain: { network: 'ethereum', networkId: EthereumNetwork.RINKEBY }, address: collectionAddress })
      let floorPriceRinkeby
      if (collection?.id === 'testing2') floorPriceRinkeby = $ETH(1)
      else if (collection?.id === 'testing' || collection?.id === 'testing3') floorPriceRinkeby = $ETH(0.1)
      else throw failure('UNSUPPORTED_COLLECTION')
      floorPricesRinkeby.push({
        collection,
        value1DReference: floorPriceRinkeby,
      })
    }
    return floorPricesRinkeby
  default:
    throw failure('UNSUPPORTED_NETWORK')
  }
}
