import { expect } from 'chai'
import { describe, it } from 'mocha'
import appConf from '../../app.conf'
import { initDb } from '../../db'
import { Blockchain, NFT, Valuation } from '../../entities'
import { getEthNFTsByOwner } from '../collaterals'
import getEthNFTValuation from './getEthNFTValuation'

describe('controllers/valuations/getEthNFTValuation', () => {
  const TEST_WALLET_ADDRESS = appConf.tests.walletAddress
  const WHALE_WALLET_ADDRESSES = appConf.tests.whaleWalletAddresses

  before('connect to db', async () => {
    await initDb()
  })

  describe('Mainnet', () => {
    const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN)
    let supportedTestNFTs: NFT[]
    let supportedWhaleNFTs: NFT[][]

    before(async () => {
      const testNFTs = await getEthNFTsByOwner({ blockchain, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: true })
      supportedTestNFTs = testNFTs.filter(nft => nft.collection.isSupported === true)

      const whaleNFTs = await Promise.all(WHALE_WALLET_ADDRESSES.map(address => getEthNFTsByOwner({ blockchain, ownerAddress: address, populateMetadata: true })))
      supportedWhaleNFTs = whaleNFTs.map(nfts => nfts.filter(nft => nft.collection.isSupported === true))
    })

    it('can get valuation of each supported NFT in test wallet', async () => {
      for (const nft of supportedTestNFTs) {
        const valuation = await getEthNFTValuation({ blockchain, collectionAddress: nft.collection.address, nftId: nft.id })
          .catch(err => {
            console.error(`Failed to get valuation for NFT ${JSON.stringify(nft)}:`, err)
            throw err
          })

        expect(valuation).to.have.all.keys(...Object.keys(Valuation.codingResolver))
      }
    })

    WHALE_WALLET_ADDRESSES.forEach((address, i) => {
      it(`can get valuation of each supported NFT in whale wallet <${address}>`, async () => {
        for (const nft of supportedWhaleNFTs[i]) {
          const valuation = await getEthNFTValuation({ blockchain, collectionAddress: nft.collection.address, nftId: nft.id })
            .catch(err => {
              console.error(`Failed to get valuation for NFT ${JSON.stringify(nft)}:`, err)
              throw err
            })

          expect(valuation).to.have.all.keys(...Object.keys(Valuation.codingResolver))
        }
      })
    })
  })

  describe('Rinkeby', () => {
    const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.RINKEBY)
    let supportedTestNFTs: NFT[]

    before(async () => {
      const testNFTs = await getEthNFTsByOwner({ blockchain, ownerAddress: TEST_WALLET_ADDRESS, populateMetadata: true })
      supportedTestNFTs = testNFTs.filter(nft => nft.collection.isSupported === true)
    })

    it('can get valuation of each supported NFT in test wallet', async () => {
      for (const nft of supportedTestNFTs) {
        const valuation = await getEthNFTValuation({ blockchain, collectionAddress: nft.collection.address, nftId: nft.id })
          .catch(err => {
            console.error(`Failed to get valuation for NFT ${JSON.stringify(nft)}:`, err)
            throw err
          })

        expect(valuation).to.have.all.keys(...Object.keys(Valuation.codingResolver))
      }
    })
  })
})
