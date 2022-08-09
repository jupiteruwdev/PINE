import _ from 'lodash'
import { describe, it } from 'mocha'
import appConf from '../../app.conf'
import { initDb } from '../../db'
import { Blockchain, Collection } from '../../entities'
import { getEthNFTsByOwner } from '../collaterals'
import getEthCollectionFloorPrices from './getEthCollectionFloorPrices'

describe('controllers/collections/getEthCollectionFloorPrices', () => {
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

    it('can get floor price of all collections in test wallet', async () => {
      await getEthCollectionFloorPrices({ blockchain, collectionAddresses: collectionsInTestWallet.map(t => t.address) })
    })

    WHALE_WALLET_ADDRESSES.forEach((address, i) => {
      it(`can get floor price of all collections in whale wallet <${address}>`, async () => {
        await getEthCollectionFloorPrices({ blockchain, collectionAddresses: collectionsInWhaleWallets[i].map(t => t.address) })
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

    it('can get floor price of all supported Ethereum collections on Rinkeby', async () => {
      await getEthCollectionFloorPrices({ blockchain, collectionAddresses: collectionsInTestWallet.map(t => t.address) })
    })
  })
})
