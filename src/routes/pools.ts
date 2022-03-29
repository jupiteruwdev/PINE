import { Router } from 'express'
import _ from 'lodash'
import getAggregatedPools from '../core/getAggregatedPools'
import getPool from '../core/getPool'
import getPools from '../core/getPools'
import { serializeAggregatedPools } from '../entities/lib/AggregatedPool'
import { EthBlockchain, SolBlockchain } from '../entities/lib/Blockchain'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import { serializePool, serializePools } from '../entities/lib/Pool'
import { parseEthNetworkId } from '../utils/ethereum'
import failure from '../utils/failure'
import mapBlockchainFilterToDict from '../utils/mapBlockchainFilterToDict'

const router = Router()

router.get('/', async (req, res, next) => {
  const networkName = req.query.networkName?.toString()
  const blockchain = networkName === 'solana' ? SolBlockchain(req.query.networkId?.toString()) : EthBlockchain(parseEthNetworkId(req.query.networkId))
  const collectionAddress = req.query.collectionAddress?.toString().toLowerCase()
  if (collectionAddress) {
    const pools = await getPools({
      blockchains: {
        [blockchain.network]: blockchain.networkId,
      },
      collectionAddress,
    })
    const payload = serializePools(pools)
    res.status(200).json(payload)
  }
  else {
    try {
      const pools = await getAggregatedPools({ blockchains: _.mapValues(mapBlockchainFilterToDict(req.query, true), t => t.networkId) })
      const payload = serializeAggregatedPools(pools)
      res.status(200).json(payload)
    }
    catch (err) {
      next(failure('FETCH_AGGREGATED_POOLS_FAILURE', err))
    }
  }
})

router.get('/eth/:address', async (req, res, next) => {
  const networkId = _.toNumber(req.query.networkId ?? EthereumNetwork.MAIN)
  const poolAddress = req.params.address

  try {
    const pool = await getPool({ blockchain: EthBlockchain(networkId), poolAddress })
    const payload = serializePool(pool)
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_POOL_FAILURE', err))
  }
})

export default router
