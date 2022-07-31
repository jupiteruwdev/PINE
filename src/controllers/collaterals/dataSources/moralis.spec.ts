import { expect } from 'chai'
import _ from 'lodash'
import appConf from '../../../app.conf'
import { Blockchain, NFT } from '../../../entities'
import { fetchEthNFTsByOwner } from './moralis'

describe('controllers/collaterals/dataSources/moralis', () => {
  const MAINNET = Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN)
  const RINKEBY = Blockchain.Ethereum(Blockchain.Ethereum.Network.RINKEBY)
  const TEST_WALLET_ADDRESS = appConf.tests.walletAddress
  const WHALE_WALLET_ADDRESSES = appConf.tests.whaleWalletAddresses

  describe('fetch NFTs', () => {
    describe('Mainnet', () => {
      it(`can get NFTs for test wallet <${TEST_WALLET_ADDRESS}> without metadata`, async () => {
        const nfts = await fetchEthNFTsByOwner({ blockchain: MAINNET, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: false })

        expect(nfts).to.have.length.greaterThan(0)
        nfts.every(nft => expect(nft).to.have.all.keys(...Object.keys(_.omitBy(NFT.codingResolver, coder => coder.options.optional === true))))
      })

      it(`can get NFTs for test wallet <${TEST_WALLET_ADDRESS}> with metadata`, async () => {
        const nfts = await fetchEthNFTsByOwner({ blockchain: MAINNET, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: true })

        expect(nfts).to.have.length.greaterThan(0)
        nfts.every(nft => expect(nft).to.include.keys(...Object.keys(_.omitBy(NFT.codingResolver, coder => coder.options.optional === true))))
      })

      WHALE_WALLET_ADDRESSES.forEach(address => {
        it(`can get NFTs for whale wallet <${address}> without metadata`, async () => {
          const nfts = await fetchEthNFTsByOwner({ blockchain: MAINNET, ownerAddress: address, populateMetadata: false })

          expect(nfts).to.have.length.greaterThan(0)
          nfts.every(nft => expect(nft).to.have.all.keys(...Object.keys(_.omitBy(NFT.codingResolver, coder => coder.options.optional === true))))
        })

        it(`can get NFTs for whale wallet <${address}> with metadata`, async () => {
          const nfts = await fetchEthNFTsByOwner({ blockchain: MAINNET, ownerAddress: address, populateMetadata: true })

          expect(nfts).to.have.length.greaterThan(0)
          nfts.every(nft => expect(nft).to.include.keys(...Object.keys(_.omitBy(NFT.codingResolver, coder => coder.options.optional === true))))
        })
      })
    })

    describe('Rinkeby', () => {
      it(`can get NFTs for test wallet <${TEST_WALLET_ADDRESS}> without metadata`, async () => {
        const nfts = await fetchEthNFTsByOwner({ blockchain: RINKEBY, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: false })

        expect(nfts).to.have.length.greaterThan(0)
        nfts.every(nft => expect(nft).to.have.all.keys(...Object.keys(_.omitBy(NFT.codingResolver, coder => coder.options.optional === true))))
      })

      it(`can get NFTs for test wallet <${TEST_WALLET_ADDRESS}> with metadata`, async () => {
        const nfts = await fetchEthNFTsByOwner({ blockchain: RINKEBY, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: true })
        expect(nfts).to.have.length.greaterThan(0)
        nfts.every(nft => expect(nft).to.include.keys(...Object.keys(_.omitBy(NFT.codingResolver, coder => coder.options.optional === true))))
      })
    })
  })
})
