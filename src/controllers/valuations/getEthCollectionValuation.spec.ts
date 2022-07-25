import { assert } from 'chai'
import _ from 'lodash'
import { describe, it } from 'mocha'
import { Blockchain, Valuation } from '../../entities'
import { getCollections } from '../collections'
import getEthCollectionValuation from './getEthCollectionValuation'

describe('controllers/valuations/getEthCollectionValuation', () => {
  it('can get the valuation of a random supported Ethereum collection on Mainnet', async () => {
    const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN)
    const collections = await getCollections({ blockchainFilter: { [blockchain.network]: blockchain.networkId } })
    const collection = _.sample(collections)
    const tokenId = '1000'

    if (!collection) throw 0

    await getEthCollectionValuation({ blockchain, collectionAddress: collection.address, tokenId })
  })

  // it('can get the valuation of all supported Ethereum collections on Mainnet', async () => {
  //   const delayToAvoidOpenSea429 = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  //   const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN)
  //   const collections = await findAllCollections({ blockchainFilter: { [blockchain.network]: blockchain.networkId } })
  //   const valuations: Valuation[] = []
  //   const tokenId = '3999'

  //   for (let i = 0, n = collections.length; i < n; i++) {
  //     await delayToAvoidOpenSea429(1000)
  //     const collection = collections[i]
  //     console.log(collection)
  //     const valuation = await getEthCollectionValuation({ blockchain, collectionAddress: collection.address, tokenId })
  //     valuations.push(valuation)
  //   }

  //   assert.isArray(valuations)
  //   assert.isNotEmpty(valuations)
  // })

  it('can get the valuation of a random supported Ethereum collection on Rinkeby Testnet', async () => {
    const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.RINKEBY)
    const collections = await getCollections({ blockchainFilter: { [blockchain.network]: blockchain.networkId } })
    const collection = _.sample(collections)
    const tokenId = '1000'

    if (!collection) throw 0

    await getEthCollectionValuation({ blockchain, collectionAddress: collection.address, tokenId })
  })

  it('can get the valuation of all supported Ethereum collections on Rinkeby Testnet', async () => {
    const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.RINKEBY)
    const collections = await getCollections({ blockchainFilter: { [blockchain.network]: blockchain.networkId } })
    const tokenId = '1000'
    const valuations: Valuation[] = await Promise.all(collections.map(collection => getEthCollectionValuation({ blockchain, collectionAddress: collection.address, tokenId })))

    assert.isArray(valuations)
    assert.isNotEmpty(valuations)
  })
})
