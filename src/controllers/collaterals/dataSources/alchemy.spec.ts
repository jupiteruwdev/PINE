import { expect } from 'chai'
import _ from 'lodash'
import appConf from '../../../app.conf'
import { Blockchain, NFT } from '../../../entities'
import { fetchEthNFTMetadata, fetchEthNFTsByOwner } from './alchemy'

describe('controllers/collaterals/remoteSources/alchemy', () => {
  const MAINNET = Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN)
  const RINKEBY = Blockchain.Ethereum(Blockchain.Ethereum.Network.RINKEBY)
  const TEST_WALLET_ADDRESS = appConf.tests.walletAddress
  const WHALE_WALLET_ADDRESSES = appConf.tests.whaleWalletAddresses

  describe('fetch NFTs', () => {
    const REQUIRED_KEYS = Object.keys(_.omitBy(NFT.codingResolver, coder => coder.options.optional === true))
    const ALL_KEYS = Object.keys(NFT.codingResolver)

    describe('Mainnet', () => {

      it(`can get NFTs for test wallet <${TEST_WALLET_ADDRESS}> without metadata`, async () => {
        const nfts = await fetchEthNFTsByOwner({ blockchain: MAINNET, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: false })

        expect(nfts).to.have.length.greaterThan(0)
        nfts.every(nft => expect(nft).to.have.all.keys(...ALL_KEYS))
        nfts.every(nft => REQUIRED_KEYS.every(key => expect(nft).to.have.property(key)))
      })

      it(`can get NFTs for test wallet <${TEST_WALLET_ADDRESS}> with metadata`, async () => {
        const nfts = await fetchEthNFTsByOwner({ blockchain: MAINNET, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: true })

        expect(nfts).to.have.length.greaterThan(0)
        nfts.every(nft => expect(nft).to.have.all.keys(...ALL_KEYS))
        nfts.every(nft => REQUIRED_KEYS.every(key => expect(nft).to.have.property(key)))
      })

      WHALE_WALLET_ADDRESSES.forEach(address => {
        it(`can get NFTs for whale wallet <${address}> without metadata`, async () => {
          const nfts = await fetchEthNFTsByOwner({ blockchain: MAINNET, ownerAddress: address, populateMetadata: false })

          expect(nfts).to.have.length.greaterThan(0)
          nfts.every(nft => expect(nft).to.have.all.keys(...ALL_KEYS))
          nfts.every(nft => REQUIRED_KEYS.every(key => expect(nft).to.have.property(key)))
        })

        it(`can get NFTs for whale wallet <${address}> with metadata`, async () => {
          const nfts = await fetchEthNFTsByOwner({ blockchain: MAINNET, ownerAddress: address, populateMetadata: true })

          expect(nfts).to.have.length.greaterThan(0)
          nfts.every(nft => expect(nft).to.have.all.keys(...ALL_KEYS))
          nfts.every(nft => REQUIRED_KEYS.every(key => expect(nft).to.have.property(key)))
        })
      })
    })

    describe('Rinkeby', () => {
      it(`can get NFTs for test wallet <${TEST_WALLET_ADDRESS}> without metadata`, async () => {
        const nfts = await fetchEthNFTsByOwner({ blockchain: RINKEBY, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: false })

        expect(nfts).to.have.length.greaterThan(0)
        nfts.every(nft => expect(nft).to.have.all.keys(...ALL_KEYS))
        nfts.every(nft => REQUIRED_KEYS.every(key => expect(nft).to.have.property(key)))
      })

      it(`can get NFTs for test wallet <${TEST_WALLET_ADDRESS}> with metadata`, async () => {
        const nfts = await fetchEthNFTsByOwner({ blockchain: RINKEBY, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: true })

        expect(nfts).to.have.length.greaterThan(0)
        nfts.every(nft => expect(nft).to.have.all.keys(...ALL_KEYS))
        nfts.every(nft => REQUIRED_KEYS.every(key => expect(nft).to.have.property(key)))
      })
    })
  })

  describe('fetch NFT metadata', () => {
    describe('Mainnet', () => {
      it(`can get metadata for NFTs in test wallet <${TEST_WALLET_ADDRESS}>`, async () => {
        const nfts = await fetchEthNFTsByOwner({ blockchain: MAINNET, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: false })

        expect(nfts).to.have.length.greaterThan(0)

        const metadata = await Promise.all(nfts.map(nft => fetchEthNFTMetadata({ blockchain: MAINNET, collectionAddress: nft.collection.address, nftId: nft.id })))

        expect(metadata).to.have.lengthOf(nfts.length)
        metadata.every(t => expect(t).to.have.all.keys('name', 'imageUrl'))
      })
    })
  })
})
