import { assert } from 'chai'
import { describe, it } from 'mocha'
import { findAll as findAllCollections } from '../db/collections'
import { EthBlockchain } from '../entities/lib/Blockchain'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import Valuation, { isValuation } from '../entities/lib/Valuation'
import getEthCollectionValuation from './getEthCollectionValuation'

describe('core/getEthCollectionValuation', () => {
  it('can get the valuation of all supported Ethereum collections on Mainnet', async () => {
    const blockchain = EthBlockchain(EthereumNetwork.MAIN)
    const collections = await findAllCollections({ blockchains: { [blockchain.network]: blockchain.networkId } })
    const valuations: Valuation[] = await Promise.all(collections.map(collection => getEthCollectionValuation({ blockchain, collectionAddress: collection.address })))

    assert.isArray(valuations)
    assert.isNotEmpty(valuations)
    assert.isTrue(valuations.reduce((prev, curr) => prev && isValuation(curr), true))
  })

  it('can get the valuation of all supported Ethereum collections on Rinkeby Testnet', async () => {
    const blockchain = EthBlockchain(EthereumNetwork.RINKEBY)
    const collections = await findAllCollections({ blockchains: { [blockchain.network]: blockchain.networkId } })
    const valuations: Valuation[] = await Promise.all(collections.map(collection => getEthCollectionValuation({ blockchain, collectionAddress: collection.address })))

    assert.isArray(valuations)
    assert.isNotEmpty(valuations)
    assert.isTrue(valuations.reduce((prev, curr) => prev && isValuation(curr), true))
  })
})
