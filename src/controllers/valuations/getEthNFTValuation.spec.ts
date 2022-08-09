import { assert } from 'chai'
import _ from 'lodash'
import { describe, it } from 'mocha'
import appConf from '../../app.conf'
import { initDb } from '../../db'
import { Blockchain, Valuation } from '../../entities'
import { getCollections } from '../collections'
import getEthNFTValuation from './getEthNFTValuation'

describe('controllers/valuations/getEthNFTValuation', () => {
  const TEST_WALLET_ADDRESS = appConf.tests.walletAddress
  const WHALE_WALLET_ADDRESSES = appConf.tests.whaleWalletAddresses

  before('connect to db', async () => {
    await initDb()
  })

  describe('Mainnet', () => {
    it('can get the valuation of a random supported Ethereum collection on Mainnet', async () => {
      const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN)
      const collections = await getCollections({ blockchainFilter: { [blockchain.network]: blockchain.networkId } })
      const collection = _.sample(collections)
      const tokenId = '1000'

      if (!collection) throw 0

      await getEthNFTValuation({ blockchain, collectionAddress: collection.address, tokenId })
    })
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
  //     const valuation = await getEthNFTValuation({ blockchain, collectionAddress: collection.address, tokenId })
  //     valuations.push(valuation)
  //   }

  //   assert.isArray(valuations)
  //   assert.isNotEmpty(valuations)
  // })

  it('can get the valuation of a random supported Ethereum collection on Rinkeby', async () => {
    const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.RINKEBY)
    const collections = await getCollections({ blockchainFilter: { [blockchain.network]: blockchain.networkId } })
    const collection = _.sample(collections)
    const tokenId = '1000'

    if (!collection) throw 0

    await getEthNFTValuation({ blockchain, collectionAddress: collection.address, tokenId })
  })

  it('can get the valuation of all supported Ethereum collections on Rinkeby', async () => {
    const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.RINKEBY)
    const collections = await getCollections({ blockchainFilter: { [blockchain.network]: blockchain.networkId } })
    const tokenId = '1000'
    const valuations: Valuation[] = await Promise.all(collections.map(collection => getEthNFTValuation({ blockchain, collectionAddress: collection.address, tokenId })))

    assert.isArray(valuations)
    assert.isNotEmpty(valuations)
  })
})
