import { assert } from 'chai'
import _ from 'lodash'
import { describe, it } from 'mocha'
import { findAll as findAllCollections } from '../db/collections'
import { EthBlockchain } from '../entities/lib/Blockchain'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import Valuation, { isValuation } from '../entities/lib/Valuation'
import getEthCollectionValuation from './getEthCollectionValuation'

describe('core/getEthCollectionValuation', () => {
  it('can get the valuation of a random supported Ethereum collection on Mainnet', async () => {
    const blockchain = EthBlockchain(EthereumNetwork.MAIN)
    const collections = await findAllCollections({ blockchains: { [blockchain.network]: blockchain.networkId } })
    const collection = _.sample(collections)

    if (!collection) throw Error()

    const valuation = await getEthCollectionValuation({ blockchain, collectionAddress: collection.address })

    assert.isTrue(isValuation(valuation))
  })

  it('can get the valuation of all supported Ethereum collections on Mainnet', async () => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    const blockchain = EthBlockchain(EthereumNetwork.MAIN)
    const collections = await findAllCollections({ blockchains: { [blockchain.network]: blockchain.networkId } })
    const valuations: Valuation[] = []

    for (let i = 0, n = collections.length; i < n; i++) {
      await delay(1000)
      const collection = collections[i]
      const valuation = await getEthCollectionValuation({ blockchain, collectionAddress: collection.address })
      valuations.push(valuation)
    }

    assert.isArray(valuations)
    assert.isNotEmpty(valuations)
    assert.isTrue(valuations.reduce((prev, curr) => prev && isValuation(curr), true))
  })

  it('can get the valuation of a random supported Ethereum collection on Rinkeby Testnet', async () => {
    const blockchain = EthBlockchain(EthereumNetwork.RINKEBY)
    const collections = await findAllCollections({ blockchains: { [blockchain.network]: blockchain.networkId } })
    const collection = _.sample(collections)

    if (!collection) throw Error()

    const valuation = await getEthCollectionValuation({ blockchain, collectionAddress: collection.address })

    assert.isTrue(isValuation(valuation))
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