import { Router } from 'express'
import _ from 'lodash'
import getAggregatedPools from '../core/getAggregatedPools'
import getPool from '../core/getPool'
import { serializeAggregatedPools } from '../entities/lib/AggregatedPool'
import { EthBlockchain } from '../entities/lib/Blockchain'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import { serializePool } from '../entities/lib/Pool'
import failure from '../utils/failure'
import mapBlockchainFilterToDict from '../utils/mapBlockchainFilterToDict'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const pools = await getAggregatedPools({ blockchains: _.mapValues(mapBlockchainFilterToDict(req.query, true), t => t.networkId) })
    const payload = serializeAggregatedPools(pools)
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_AGGREGATED_POOLS_FAILURE', err))
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
