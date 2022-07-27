import { assert } from 'chai'
import { describe, it } from 'mocha'
import { initDb } from '../../db'
import { Blockchain, Value } from '../../entities'
import { getCollections } from '../collections'
import getEthCollectionFloorPrice from './getEthCollectionFloorPrice'

describe('controllers/valuations/getEthCollectionFloorPrice', () => {
  before('connect to db', async () => {
    await initDb()
  })

  it('can get the floor price of all supported Ethereum collections on Mainnet', async () => {
    const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN)
    const collections = await getCollections({ blockchainFilter: { [blockchain.network]: blockchain.networkId } })
    const floorPrices: Value<'ETH'>[] = await Promise.all(collections.map(collection => getEthCollectionFloorPrice({ blockchain, collectionAddress: collection.address })))

    assert.isArray(floorPrices)
    assert.isNotEmpty(floorPrices)
  })

  it('can get the floor price of all supported Ethereum collections on Rinkeby Testnet', async () => {
    const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.RINKEBY)
    const collections = await getCollections({ blockchainFilter: { [blockchain.network]: blockchain.networkId } })
    const floorPrices: Value<'ETH'>[] = await Promise.all(collections.map(collection => getEthCollectionFloorPrice({ blockchain, collectionAddress: collection.address })))

    assert.isArray(floorPrices)
    assert.isNotEmpty(floorPrices)
  })
})
