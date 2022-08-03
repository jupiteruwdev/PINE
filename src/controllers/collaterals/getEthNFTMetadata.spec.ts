import { expect } from 'chai'
import { getEthNFTsByOwner } from '.'
import appConf from '../../app.conf'
import { Blockchain } from '../../entities'
import getEthNFTMetadata from './getEthNFTMetadata'

describe('controllers/collaterals/remoteSources/alchemy', () => {
  const MAINNET = Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN)
  const RINKEBY = Blockchain.Ethereum(Blockchain.Ethereum.Network.RINKEBY)
  const TEST_WALLET_ADDRESS = appConf.tests.walletAddress
  const WHALE_WALLET_ADDRESSES = appConf.tests.whaleWalletAddresses

  describe('Mainnet', () => {
    it(`can get metadata for NFTs in test wallet <${TEST_WALLET_ADDRESS}>`, async () => {
      const nfts = await getEthNFTsByOwner({ blockchain: MAINNET, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: false })
      expect(nfts).to.have.length.greaterThan(0)
      const metadata = await Promise.all(nfts.map(nft => getEthNFTMetadata({ blockchain: MAINNET, collectionAddress: nft.collection.address, nftId: nft.id })))
      expect(metadata).to.have.lengthOf(nfts.length)
    })

    WHALE_WALLET_ADDRESSES.forEach(address => {
      it(`can get NFTs for whale wallet <${address}> without metadata`, async () => {
        const nfts = await getEthNFTsByOwner({ blockchain: MAINNET, ownerAddress: address, populateMetadata: false })
        expect(nfts).to.have.length.greaterThan(0)
        const metadata = await Promise.all(nfts.map(nft => getEthNFTMetadata({ blockchain: MAINNET, collectionAddress: nft.collection.address, nftId: nft.id })))
        expect(metadata).to.have.lengthOf(nfts.length)
      }).timeout(0)
    })
  })

  describe('Rinkeby', () => {
    it(`can get metadata for NFTs in test wallet <${TEST_WALLET_ADDRESS}>`, async () => {
      const nfts = await getEthNFTsByOwner({ blockchain: RINKEBY, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: false })

      expect(nfts).to.have.length.greaterThan(0)

      const metadata = await Promise.all(nfts.map(nft => getEthNFTMetadata({ blockchain: RINKEBY, collectionAddress: nft.collection.address, nftId: nft.id })))

      expect(metadata).to.have.lengthOf(nfts.length)
    })
  })
})
