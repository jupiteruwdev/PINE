import { addressesByNetwork, SupportedChainId } from '@looksrare/sdk'
import EXCHANGE_ABI from '@looksrare/sdk/dist/abis/LooksRareExchange.json' assert { type: 'json' }
import HDWalletProvider from '@truffle/hdwallet-provider'
import BigNumber from 'bignumber.js'
import { ethers } from 'ethers'
import _ from 'lodash'
import { Network, OpenSeaPort } from 'opensea-js'
import appConf from '../app.conf'
import { searchPoolGroups } from '../controllers'
import getRequest from '../controllers/utils/getRequest'
import { BidOrderModel, initDb } from '../db'
import { Blockchain, Pool, PoolGroup, Value } from '../entities'
import fault from '../utils/fault'
import logger from '../utils/logger'
import rethrow from '../utils/rethrow'
import sleep from '../utils/sleep'

type CancelBidOrderParams = {
  blockchain: Blockchain
  bidOrder: BidOrder
  isCancel: boolean
}

type UpdateBidOrderParams = {
  blockchain: Blockchain
  listingTime?: number
  orderNonce?: number
  nftId: string
  marketplace: 'opensea' | 'looksrare' | 'x2y2'
  status: string
}

type BidOrder = {
  networkId: string
  networkType: string
  listingTime?: number
  expirationTime: number
  orderNonce?: number
  nftId: string
  marketplace: 'opensea' | 'looksrare' | 'x2y2'
  status: string
  bidPrice: string
  collection: {
    _id: string
    address: string
    valuation: {
      value24Hr: {
        amount: number
        currency: string
      }
      value: {
        amount: number
        currency: string
      }
    }
    timestamp: number
  }
}

function getPoolMaxLTV(pool?: Pool): BigNumber {
  if (pool?.loanOptions === undefined) return new BigNumber(NaN)
  return pool.loanOptions.reduce((p, c) => c.maxLTVBPS.gt(p) ? c.maxLTVBPS : p, new BigNumber(0)).div(10_000)
}

function getMaxLTV(pool?: PoolGroup): BigNumber {
  if (pool === undefined) return new BigNumber(NaN)

  return pool.pools.reduce((p, c) => {
    const t = getPoolMaxLTV(c)
    return t.gt(p) ? t : p
  }, new BigNumber(0))
}

async function updateBidOrder({ blockchain, listingTime, nftId, marketplace, orderNonce, status }: UpdateBidOrderParams) {
  await BidOrderModel.updateOne({
    networkId: blockchain.networkId,
    networkType: blockchain.network,
    listingTime,
    orderNonce,
    nftId,
    marketplace,
    status: 'open',
  }, {
    $set: {
      status,
    },
  })
}

async function getAllBidOrders(): Promise<BidOrder[]> {
  const bidOrders = await BidOrderModel.aggregate([
    {
      $match: {
        'status': 'open',
      },
    },
    {
      $lookup: {
        from: 'nftCollections',
        localField: 'nftCollection',
        foreignField: '_id',
        as: 'collection',
      },
    },
    {
      $unwind: '$collection',
    },
  ]).exec()

  return bidOrders
}

async function updateOpenseaBidOrder({ blockchain, bidOrder, isCancel }: CancelBidOrderParams) {
  try {
    logger.info(`JOB_SYNC_BID_ORDERS update Opensea bid order for nftAddress <${bidOrder.collection.address}> and nftId <${bidOrder.nftId}> on blockchain <${JSON.stringify(blockchain)}>...`)
    const signerPrivateKey = appConf.signer ?? rethrow('Missing signer private key')
    const rpcUrl = _.get(appConf.ethRPC, blockchain.networkId) ?? rethrow(`Missing rpc url for blockchain <${JSON.stringify(blockchain)}>`)

    const signer = new ethers.Wallet(signerPrivateKey)
    const signerAddress = await signer.getAddress()

    const provider = new HDWalletProvider({
      privateKeys: [signerPrivateKey],
      providerOrUrl: rpcUrl,
    })

    const seaport = new OpenSeaPort(provider as any, {
      networkName: blockchain.networkId === Blockchain.Ethereum.Network.GOERLI ? Network.Goerli : Network.Main,
    })
    let order
    try {
      order = await seaport.api.getOrder({
        side: 'bid',
        protocol: 'seaport',
        assetContractAddress: bidOrder.collection.address,
        tokenId: bidOrder.nftId,
        maker: signerAddress,
        listedAfter: bidOrder.listingTime ? bidOrder.listingTime - 1 : 0,
      })

      if (isCancel && order) {
        await seaport.cancelOrder({
          order,
          accountAddress: signerAddress,
        })
        await updateBidOrder({ blockchain, nftId: bidOrder.nftId, marketplace: 'opensea', listingTime: bidOrder.listingTime, status: 'cancelled' })
        logger.info(`JOB_SYNC_BID_ORDERS update Opensea bid order for nftAddress <${bidOrder.collection.address}> and nftId <${bidOrder.nftId}> on blockchain <${JSON.stringify(blockchain)}>... OK`)
      }
    }
    catch (err) {
      if (!order) {
        await updateBidOrder({ blockchain, nftId: bidOrder.nftId, marketplace: 'opensea', listingTime: bidOrder.listingTime, status: 'executed' })
      }
    }
  }
  catch (err) {
    logger.error(`JOB_SYNC_BID_ORDERS update Opensea bid order for nftAddress <${bidOrder.collection.address}> and nftId <${bidOrder.nftId}> on blockchain <${JSON.stringify(blockchain)}>... ERR`, err)
  }
}

async function updateLooksrareBidOrder({ blockchain, bidOrder, isCancel }: CancelBidOrderParams) {
  try {
    logger.info(`JOB_SYNC_BID_ORDERS update Looksrare bid order for nftAddress <${bidOrder.collection.address}> and nftId <${bidOrder.nftId}> on blockchain <${JSON.stringify(blockchain)}>...`)
    const rpcUrl = _.get(appConf.ethRPC, blockchain.networkId) ?? rethrow(`Missing rpc url for blockchain <${JSON.stringify(blockchain)}>`)
    const signerPrivateKey = appConf.signer ?? rethrow('Missing signer private key')
    const baseUrl = _.get(appConf.looksrareAPIUrl, blockchain.networkId) ?? rethrow(`Missing looksrare API url for blockchain <${JSON.stringify(blockchain)}>`)

    const offer = await getRequest(`${baseUrl}api/v1/orders`, {
      params: {
        isOrderAsk: false,
        collection: bidOrder.collection.address,
        tokenId: bidOrder.nftId,
        nonce: bidOrder.orderNonce,
      },
    })

    if (_.get(offer, 'data.status') === 'VALID' && isCancel) {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
      const signer = new ethers.Wallet(signerPrivateKey).connect(provider)
      const chainId = _.parseInt(blockchain.networkId) as SupportedChainId
      const addresses = addressesByNetwork[chainId]
      const looksrareExchangeContract = new ethers.Contract(addresses.EXCHANGE, EXCHANGE_ABI)
      await looksrareExchangeContract.connect(signer).cancelMultipleMakeOrders([bidOrder.orderNonce])
    }

    let status = 'cancelled'
    if (_.get(offer, 'data.status') === 'EXECUTED') status = 'executed'

    await updateBidOrder({ blockchain, nftId: bidOrder.nftId, marketplace: 'looksrare', listingTime: bidOrder.listingTime, status })
    logger.info(`JOB_SYNC_BID_ORDERS update Looksrare bid order for nftAddress <${bidOrder.collection.address}> and nftId <${bidOrder.nftId}> on blockchain <${JSON.stringify(blockchain)}>... OK`)
  }
  catch (err) {
    logger.error(`JOB_SYNC_BID_ORDERS update Looksrare bid order for nftAddress <${bidOrder.collection.address}> and nftId <${bidOrder.nftId}> on blockchain <${JSON.stringify(blockchain)}>... ERR`, err)
  }
}

export default async function syncBidOrders() {
  try {
    await initDb({
      onError: err => {
        logger.error('Establishing database conection... ERR:', err)
        throw fault('ERR_DB_CONNECTION', undefined, err)
      },
      onOpen: () => {
        logger.info('Establishing database connection... OK')
      },
    })
    const bidOrders = await getAllBidOrders()

    for (const bidOrder of bidOrders) {
      try {
        const now = Math.floor(Date.now() / 1000)
        const blockchain = Blockchain.factory({
          network: bidOrder.networkType,
          networkId: bidOrder.networkId,
        })
        const poolGroups = await searchPoolGroups({ blockchainFilter: {
          ethereum: blockchain.networkId,
        }, collectionAddress: bidOrder.collection.address })

        if (!poolGroups.length) continue
        const maxLtv = getMaxLTV(poolGroups[0])
        const floorPrice = Value.factory({ ...bidOrder.collection.valuation.value })
        const limit = ethers.utils.parseEther(maxLtv.multipliedBy(floorPrice.amount).toString())

        if (now > bidOrder.expirationTime) {
          updateBidOrder({
            ...bidOrder,
            blockchain,
            status: 'expired',
          })
        }
        else {
          switch (bidOrder.marketplace) {
          case 'opensea':
            await updateOpenseaBidOrder({ blockchain, bidOrder, isCancel: limit.lt(bidOrder.bidPrice) })
            break
          case 'looksrare':
            await updateLooksrareBidOrder({ blockchain, bidOrder, isCancel: limit.lt(bidOrder.bidPrice) })
            break
          case 'x2y2':
          }
          await sleep(1000)
        }
      }
      catch (err) {
        logger.error('JOB_SYNC_BID_ORDERS Handling bidorder... ERR:', err)
        process.exit(1)
      }
    }
    res.status(200).send()
  }
  catch (err) {
    logger.error('JOB_SYNC_BID_ORDERS Handling runtime error... ERR:', err)
    process.exit(1)
  }
}

syncBidOrders()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1) // Retry Job Task by exiting the process
  })
