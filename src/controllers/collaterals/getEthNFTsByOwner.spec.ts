import { expect } from 'chai'
import _ from 'lodash'
import appConf from '../../app.conf'
import { initDb } from '../../db'
import { Blockchain, NFT } from '../../entities'
import getEthNFTsByOwner from './getEthNFTsByOwner'

describe('controllers/collaterals/getEthNFTsByOwner', () => {
  const TEST_WALLET_ADDRESS = appConf.tests.walletAddress
  const WHALE_WALLET_ADDRESSES = appConf.tests.whaleWalletAddresses
  const REQUIRED_NFT_KEYS = Object.keys(_.omitBy(NFT.codingResolver, coder => coder.options.optional === true))
  const ALL_NFT_KEYS = Object.keys(NFT.codingResolver)

  before('connect to db', async () => {
    await initDb()
  })

  describe('Mainnet', () => {
    const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN)

    it(`can get NFTs for test wallet <${TEST_WALLET_ADDRESS}> without metadata`, async () => {
      const nfts = await getEthNFTsByOwner({ blockchain, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: false })

      expect(nfts).to.have.length.greaterThan(0)
      nfts.every(nft => expect(nft).to.have.all.keys(...ALL_NFT_KEYS))
      nfts.every(nft => REQUIRED_NFT_KEYS.every(key => expect(_.get(nft, key)).to.not.be.undefined))
    })

    it(`can get NFTs for test wallet <${TEST_WALLET_ADDRESS}> with metadata`, async () => {
      const nfts = await getEthNFTsByOwner({ blockchain, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: true })

      expect(nfts).to.have.length.greaterThan(0)
      nfts.every(nft => expect(nft).to.have.all.keys(...ALL_NFT_KEYS))
      nfts.every(nft => REQUIRED_NFT_KEYS.every(key => expect(_.get(nft, key)).to.not.be.undefined))
    })

    WHALE_WALLET_ADDRESSES.forEach(address => {
      it(`can get NFTs for whale wallet <${address}> without metadata`, async () => {
        const nfts = await getEthNFTsByOwner({ blockchain, ownerAddress: address, populateMetadata: false })

        expect(nfts).to.have.length.greaterThan(0)
        nfts.every(nft => expect(nft).to.have.all.keys(...ALL_NFT_KEYS))
        nfts.every(nft => REQUIRED_NFT_KEYS.every(key => expect(_.get(nft, key)).to.not.be.undefined))
      })

      it(`can get NFTs for whale wallet <${address}> with metadata`, async () => {
        const nfts = await getEthNFTsByOwner({ blockchain, ownerAddress: address, populateMetadata: true })

        expect(nfts).to.have.length.greaterThan(0)
        nfts.every(nft => expect(nft).to.have.all.keys(...ALL_NFT_KEYS))
        nfts.every(nft => REQUIRED_NFT_KEYS.every(key => expect(_.get(nft, key)).to.not.be.undefined))
      })
    })
  })

  describe('Rinkeby', () => {
    const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.RINKEBY)

    it(`can get NFTs for test wallet <${TEST_WALLET_ADDRESS}> without metadata`, async () => {
      const nfts = await getEthNFTsByOwner({ blockchain, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: false })

      expect(nfts).to.have.length.greaterThan(0)
      nfts.every(nft => expect(nft).to.have.all.keys(...ALL_NFT_KEYS))
      nfts.every(nft => REQUIRED_NFT_KEYS.every(key => expect(_.get(nft, key)).to.not.be.undefined))
    })

    it(`can get NFTs for test wallet <${TEST_WALLET_ADDRESS}> with metadata`, async () => {
      const nfts = await getEthNFTsByOwner({ blockchain, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: true })

      expect(nfts).to.have.length.greaterThan(0)
      nfts.every(nft => expect(nft).to.have.all.keys(...ALL_NFT_KEYS))
      nfts.every(nft => REQUIRED_NFT_KEYS.every(key => expect(_.get(nft, key)).to.not.be.undefined))
    })
  })
})
