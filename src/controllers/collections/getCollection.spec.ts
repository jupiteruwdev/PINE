import { expect } from 'chai'
import _ from 'lodash'
import { describe, it } from 'mocha'
import appConf from '../../app.conf'
import { initDb } from '../../db'
import { Blockchain, Collection } from '../../entities'
import { getEthNFTsByOwner } from '../collaterals'
import getCollection from './getCollection'

describe('controllers/collections/getCollection', () => {
  const TEST_WALLET_ADDRESS = appConf.tests.walletAddress
  const WHALE_WALLET_ADDRESSES = appConf.tests.whaleWalletAddresses

  before('connect to db', async () => {
    await initDb()
  })

  describe('Mainnet', () => {
    const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN)
    let collectionAddressesInTestWallet: string[]
    let collectionAddressesInWhaleWallets: string[][]

    before('fetch all collections', async () => {
      const nfts = await getEthNFTsByOwner({ blockchain, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: false })
      collectionAddressesInTestWallet = _.uniqBy(nfts.map(nft => nft.collection), collection => collection.address.toLowerCase()).map(collection => collection.address)

      const whaleNFTs = await Promise.all(WHALE_WALLET_ADDRESSES.map(address => getEthNFTsByOwner({ blockchain, ownerAddress: address, populateMetadata: false })))
      collectionAddressesInWhaleWallets = whaleNFTs.map(nfts => _.uniqBy(nfts.map(nft => nft.collection), collection => collection.address.toLowerCase()).map(collection => collection.address))
    })

    it('can get each collection in test wallet', async () => {
      for (const address of collectionAddressesInTestWallet) {
        const collection = await getCollection({ blockchain, address })
        expect(collection).to.have.all.keys(...Object.keys(Collection.codingResolver))
      }
    })

    WHALE_WALLET_ADDRESSES.forEach((address, i) => {
      it(`can get each collection in whale wallet <${address}>`, async () => {
        for (const address of collectionAddressesInWhaleWallets[i]) {
          const collection = await getCollection({ blockchain, address })
          expect(collection).to.have.all.keys(...Object.keys(Collection.codingResolver))
        }
      })
    })
  })

  describe('Rinkeby', () => {
    const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.RINKEBY)
    let collectionAddressesInTestWallet: string[]

    before('fetch all collections', async () => {
      const nfts = await getEthNFTsByOwner({ blockchain, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: false })
      collectionAddressesInTestWallet = _.uniqBy(nfts.map(nft => nft.collection), collection => collection.address.toLowerCase()).map(collection => collection.address)
    })

    it('can get each colleciton in test wallet', async () => {
      for (const address of collectionAddressesInTestWallet) {
        const collection = await getCollection({ blockchain, address })
        expect(collection).to.have.all.keys(...Object.keys(Collection.codingResolver))
      }
    })
  })
})
