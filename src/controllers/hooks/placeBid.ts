import { addressesByNetwork, generateMakerOrderTypedData, MakerOrder, SupportedChainId } from '@looksrare/sdk'
import HDWalletProvider from '@truffle/hdwallet-provider'
import ethers from 'ethers'
import _ from 'lodash'
import { Chain, OpenSeaPort } from 'opensea-js'
import ERC20 from '../../abis/ERC20.json' assert { type: 'json' }
import appConf from '../../app.conf'
import { BidOrderModel, NFTCollectionModel } from '../../db'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import postRequest from '../utils/postRequest'

enum X2Y2Network {
  Mainnet = 'mainnet',
  Goerli = 'goerli'
}

type Params = {
  blockchain: Blockchain
  body: Record<string, any>
}

type MarketplaceParams = {
  blockchain: Blockchain
  bidPrice: string
  nftAddress: string
  nftId: string
  attempt: number
  cachedOffer?: any
}

type SaveBidOrderParams = {
  blockchain: Blockchain
  bidPrice: string
  nftAddress: string
  nftId: string
  marketplace: 'opensea' | 'looksrare'
  listingTime?: string
  expirationTime: number
  orderNonce?: number
}

async function saveBidOrder({ blockchain, bidPrice, nftAddress, nftId, marketplace, listingTime, orderNonce, expirationTime }: SaveBidOrderParams) {
  const nftCollection = await NFTCollectionModel.findOne({ address: {
    '$regex': nftAddress,
    '$options': 'i',
  } }).exec()

  const res = await BidOrderModel.create({
    nftId,
    networkId: blockchain.networkId,
    networkType: blockchain.network,
    marketplace,
    listingTime,
    expirationTime,
    orderNonce,
    nftCollection: nftCollection?._id,
    bidPrice,
    status: 'open',
  })

  return res.toObject()
}

async function openSeaPlaceBid({ blockchain, bidPrice, nftAddress, nftId, attempt, cachedOffer }: MarketplaceParams) {
  let offer = cachedOffer
  try {
    logger.info(`OpenSea place bid for collection <${nftAddress}> and nftId <${nftId}> on blockchain <${JSON.stringify(blockchain)}> - Attempt <${attempt}>...`)
    const now = Math.floor(Date.now() / 1000)
    switch (blockchain.network) {
    case 'ethereum':
      if (!offer) {
        const signerPrivateKey = appConf.signer ?? rethrow('Missing signer private key')
        const rpcUrl = _.get(appConf.ethRPC, blockchain.networkId) ?? rethrow(`Missing rpc url for blockchain <${JSON.stringify(blockchain)}>`)

        const signer = new ethers.Wallet(signerPrivateKey)
        const signerAddress = await signer.getAddress()

        const provider = new HDWalletProvider({
          privateKeys: [signerPrivateKey],
          providerOrUrl: rpcUrl,
        })

        const seaport = new OpenSeaPort(provider as any, {
          chain: blockchain.networkId === Blockchain.Ethereum.Network.GOERLI ? Chain.Goerli : Chain.Mainnet,
        })

        offer = await seaport.createBuyOrder({
          asset: {
            tokenAddress: nftAddress,
            tokenId: nftId,
          },
          accountAddress: signerAddress,
          startAmount: ethers.utils.formatEther(bidPrice),
          expirationTime: now + 86400 * 3, // 3 days
        })
      }

      await saveBidOrder({ blockchain, nftAddress, nftId, marketplace: 'opensea', listingTime: _.get(offer, 'listingTime'), bidPrice, expirationTime: now + 86400 * 3 })

      logger.info(`OpenSea place bid for collection <${nftAddress}> and nftId <${nftId}> on blockchain <${JSON.stringify(blockchain)}> - Attempt <${attempt}>... OK`)
      return
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }
  }
  catch (err) {
    logger.error(`OpenSea place bid for collection <${nftAddress}> and nftId <${nftId}> on blockchain <${JSON.stringify(blockchain)}> - Attempt <${attempt}>... ERR`, err)
    if (attempt < 2) {
      openSeaPlaceBid({ blockchain, bidPrice, nftAddress, nftId, attempt: attempt + 1, cachedOffer: offer })
    }
    else {
      return
    }
  }
}

async function looksrarePlaceBid({ blockchain, bidPrice, nftAddress, nftId, attempt, cachedOffer }: MarketplaceParams) {
  let offer = cachedOffer
  try {
    logger.info(`Looksrare place bid for collection <${nftAddress}> and nftId <${nftId}> on blockchain <${JSON.stringify(blockchain)}> - Attempt <${attempt}>...`)
    const now = Math.floor(Date.now() / 1000)
    switch (blockchain.network) {
    case 'ethereum':
      if (!offer) {
        const rpcUrl = _.get(appConf.ethRPC, blockchain.networkId) ?? rethrow(`Missing rpc url for blockchain <${JSON.stringify(blockchain)}>`)
        const signerPrivateKey = appConf.signer ?? rethrow('Missing signer private key')
        const baseUrl = _.get(appConf.looksrareAPIUrl, blockchain.networkId) ?? rethrow(`Missing looksrare API url for blockchain <${JSON.stringify(blockchain)}>`)
        const looksrareAPIKey = appConf.looksrareAPIKey ?? rethrow('Missing looksrare API key')

        const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
        const signer = new ethers.Wallet(signerPrivateKey).connect(provider)

        const signerAddress = await signer.getAddress()
        const chainId = _.parseInt(blockchain.networkId) as SupportedChainId
        const addresses = addressesByNetwork[chainId]

        const wethContract = new ethers.Contract(_.get(appConf.wethAddress, blockchain.networkId), ERC20)
        await wethContract.connect(signer).approve(addresses.EXCHANGE, bidPrice)

        const nonce = await signer.getTransactionCount()

        const makerOrder: MakerOrder = {
          isOrderAsk: false,
          signer: signerAddress,
          collection: nftAddress,
          price: bidPrice, // :warning: PRICE IS ALWAYS IN WEI :warning:
          tokenId: nftId, // Token id is 0 if you use the STRATEGY_COLLECTION_SALE strategy
          amount: '1',
          strategy: addresses.STRATEGY_STANDARD_SALE,
          currency: addresses.WETH,
          nonce,
          startTime: now,
          endTime: now + 86400 * 3, // 3 days validity
          // minPercentageToAsk: Math.max(netPriceRatio, minNetPriceRatio), // Alternatively, just set it to 9800
          minPercentageToAsk: 9800, // Alternatively, just set it to 9800
          params: [],
        }

        const { domain, value, type } = generateMakerOrderTypedData(signerAddress, chainId, makerOrder)

        const signatureHash = await signer._signTypedData(domain, type, value)

        offer = await postRequest(`${baseUrl}api/v1/orders`, {
          signature: signatureHash,
          ...makerOrder,
        }, {
          headers: {
            'content-type': 'application/json',
            'X-Looks-Api-Key': looksrareAPIKey,
          },
        })
      }

      await saveBidOrder({ blockchain, nftAddress, nftId, marketplace: 'looksrare', orderNonce: _.parseInt(_.get(offer, 'data.nonce')), bidPrice, expirationTime: now + 86400 * 3 })

      logger.info(`Looksrare place bid for collection <${nftAddress}> and nftId <${nftId}> on blockchain <${JSON.stringify(blockchain)}> - Attempt <${attempt}>... OK`)
      return
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }
  }
  catch (err) {
    logger.info(`Looksrare place bid for collection <${nftAddress}> and nftId <${nftId}> on blockchain <${JSON.stringify(blockchain)}> - Attempt <${attempt}>... ERR`, err)
    if (attempt < 2) {
      looksrarePlaceBid({ blockchain, bidPrice, nftAddress, nftId, attempt: attempt + 1, cachedOffer: offer })
    }
    else {
      return
    }
  }
}

export default async function placeBid({ blockchain, body }: Params) {
  try {
    const { marketplace, nftAddress, nftId, bidPrice } = _.get(body, 'returnValues')

    switch (marketplace) {
    case 'opensea':
      return await openSeaPlaceBid({ blockchain, bidPrice, nftAddress, nftId, attempt: 0 })
    case 'looksrare':
      return await looksrarePlaceBid({ blockchain, bidPrice, nftAddress, nftId, attempt: 0 })
    default:
    }
  }
  catch (err) {
    logger.error(`Place bid on blockchain <${JSON.stringify(blockchain)}>... ERR`, err)
    throw err
  }
}
