import { Router } from 'express'
import _ from 'lodash'
import getAggregatedPools from '../core/getAggregatedPools'
import getPool from '../core/getPool'
import { EthBlockchain } from '../entities/Blockchain'
import { EthNetwork } from '../utils/ethereum'
import failure from '../utils/failure'
import { parseBlockchains } from '../utils/params'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const blockchains = parseBlockchains(req.query)
    const payload = await getAggregatedPools(blockchains)
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_AGGREGATED_POOLS_FAILURE', err))
  }
})

router.get('/eth/:address', async (req, res, next) => {
  const networkId = _.toNumber(req.query.networkId ?? EthNetwork.MAIN)
  const poolAddress = req.params.address

  try {
    const payload = await getPool({ poolAddress }, EthBlockchain(networkId))
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_POOL_FAILURE', err))
  }
})

export default router
