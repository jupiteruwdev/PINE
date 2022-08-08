import _ from 'lodash'
import { describe, it } from 'mocha'
import appConf from '../../app.conf'
import { initDb } from '../../db'
import { Blockchain, Collection } from '../../entities'
import { getEthNFTsByOwner } from '../collaterals'
import getEthCollectionMetadata from './getEthCollectionMetadata'

describe('controllers/collections/getEthCollectionMetadata', () => {
  const TEST_WALLET_ADDRESS = appConf.tests.walletAddress
  const WHALE_WALLET_ADDRESSES = appConf.tests.whaleWalletAddresses

  before('connect to db', async () => {
    await initDb()
  })

  describe('Mainnet', () => {
    const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN)
    let collectionsInTestWallet: Collection[]
    let collectionsInWhaleWallets: Collection[][]

    before('fetch all collections', async () => {
      const nfts = await getEthNFTsByOwner({ blockchain, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: false })
      collectionsInTestWallet = _.uniqBy(nfts.map(nft => nft.collection), collection => collection.address.toLowerCase())

      const whaleNFTs = await Promise.all(WHALE_WALLET_ADDRESSES.map(address => getEthNFTsByOwner({ blockchain, ownerAddress: address, populateMetadata: false })))
      collectionsInWhaleWallets = whaleNFTs.map(nfts => _.uniqBy(nfts.map(nft => nft.collection), collection => collection.address.toLowerCase()))
    })

    it('can get metadata of all collections in test wallet', async () => {
      for (const collection of collectionsInTestWallet) {
        await getEthCollectionMetadata({ blockchain, collectionAddress: collection.address })
      }
    })

    WHALE_WALLET_ADDRESSES.forEach((address, i) => {
      it(`can get metadata of all collections in whale wallet <${address}>`, async () => {
        for (const collection of collectionsInWhaleWallets[i]) {
          await getEthCollectionMetadata({ blockchain, collectionAddress: collection.address })
        }
      })
    })
  })

  describe('Rinkeby', () => {
    const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.RINKEBY)
    let collectionsInTestWallet: Collection[]

    before('fetch all collections', async () => {
      const nfts = await getEthNFTsByOwner({ blockchain, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: false })
      collectionsInTestWallet = _.uniqBy(nfts.map(nft => nft.collection), collection => collection.address.toLowerCase())
    })

    it('can get metadata of all collections in test wallet (can be empty)', async () => {
      for (const collection of collectionsInTestWallet) {
        await getEthCollectionMetadata({ blockchain, collectionAddress: collection.address })
      }
    })
  })
})
