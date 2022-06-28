import { assert } from 'chai'
import { describe, it } from 'mocha'
import { findAllCollections } from '../db'
import { EthBlockchain, EthereumNetwork, isValue, Value } from '../entities'
import getEthCollectionFloorPrice from './getEthCollectionFloorPrice'

describe('core/getEthCollectionFloorPrice', () => {
  it('can get the floor price of all supported Ethereum collections on Mainnet', async () => {
    const blockchain = EthBlockchain(EthereumNetwork.MAIN)
    const collections = await findAllCollections({ blockchainFilter: { [blockchain.network]: blockchain.networkId } })
    const floorPrices: Value<'ETH'>[] = await Promise.all(collections.map(collection => getEthCollectionFloorPrice({ blockchain, collectionAddress: collection.address })))

    assert.isArray(floorPrices)
    assert.isNotEmpty(floorPrices)
    assert.isTrue(floorPrices.reduce((prev, curr) => prev && isValue(curr), true))
  })

  it('can get the floor price of all supported Ethereum collections on Rinkeby Testnet', async () => {
    const blockchain = EthBlockchain(EthereumNetwork.RINKEBY)
    const collections = await findAllCollections({ blockchainFilter: { [blockchain.network]: blockchain.networkId } })
    const floorPrices: Value<'ETH'>[] = await Promise.all(collections.map(collection => getEthCollectionFloorPrice({ blockchain, collectionAddress: collection.address })))

    assert.isArray(floorPrices)
    assert.isNotEmpty(floorPrices)
    assert.isTrue(floorPrices.reduce((prev, curr) => prev && isValue(curr), true))
  })
})
