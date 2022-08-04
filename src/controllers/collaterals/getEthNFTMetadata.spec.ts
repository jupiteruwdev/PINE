import { expect } from 'chai'
import { getEthNFTsByOwner } from '.'
import appConf from '../../app.conf'
import { Blockchain, NFT } from '../../entities'
import getEthNFTMetadata from './getEthNFTMetadata'

describe('controllers/collaterals/getEthNFTMetadata', () => {
  const MAINNET = Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN)
  const RINKEBY = Blockchain.Ethereum(Blockchain.Ethereum.Network.RINKEBY)
  const TEST_WALLET_ADDRESS = appConf.tests.walletAddress
  const WHALE_WALLET_ADDRESSES = appConf.tests.whaleWalletAddresses

  describe('Mainnet', () => {
    let testNFTs: NFT[]
    let whaleNFTs: NFT[][]

    before('fetch NFTs', async () => {
      testNFTs = await getEthNFTsByOwner({ blockchain: MAINNET, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: false })
      expect(testNFTs).to.have.length.greaterThan(0)

      whaleNFTs = await Promise.all(WHALE_WALLET_ADDRESSES.map(address => getEthNFTsByOwner({ blockchain: MAINNET, ownerAddress: address, populateMetadata: false })))
      whaleNFTs.every(nfts => expect(nfts).to.have.length.greaterThan(0))
    })

    it(`can get metadata for NFTs in test wallet <${TEST_WALLET_ADDRESS}>`, async () => {
      const metadata = await Promise.all(testNFTs.map(nft => getEthNFTMetadata({ blockchain: MAINNET, collectionAddress: nft.collection.address, nftId: nft.id })))
      expect(metadata).to.have.lengthOf(testNFTs.length)
    })

    WHALE_WALLET_ADDRESSES.forEach((address, i) => {
      it(`can get metadata for NFTs in whale wallet <${address}>`, async () => {
        const metadata = await Promise.all(whaleNFTs[i].map(nft => getEthNFTMetadata({ blockchain: MAINNET, collectionAddress: nft.collection.address, nftId: nft.id })))
        expect(metadata).to.have.lengthOf(whaleNFTs[i].length)
      })
    })
  })

  describe('Rinkeby', () => {
    let testNFTs: NFT[]

    before('fetch NFTs', async () => {
      testNFTs = await getEthNFTsByOwner({ blockchain: RINKEBY, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: false })
      expect(testNFTs).to.have.length.greaterThan(0)
    })

    it(`can get metadata for NFTs in test wallet <${TEST_WALLET_ADDRESS}>`, async () => {
      const metadata = await Promise.all(testNFTs.map(nft => getEthNFTMetadata({ blockchain: RINKEBY, collectionAddress: nft.collection.address, nftId: nft.id })))
      expect(metadata).to.have.lengthOf(testNFTs.length)
    })
  })
})
