import { Router } from 'express'
import getAggregatedPools from '../core/getAggregatedPools'
import { serializeAggregatedPool } from '../entities/lib/AggregatedPool'
import failure from '../utils/failure'
import { getBlockchainFilter, getString } from '../utils/query'

const router = Router()

router.get('/ethereum/:collectionAddress/pools', async (req, res, next) => {
  try {
    const collectionAddress = getString(req.query, 'collectionAddress')
    const blockchainFilter = getBlockchainFilter(req.query, true)
    const pools = await getAggregatedPools({ blockchainFilter, collectionAddress })
    const payload = serializeAggregatedPool(pools[0])
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_AGGREGATED_POOLS_FAILURE', err))
  }
})

export default router
