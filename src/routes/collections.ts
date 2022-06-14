import { Router } from 'express'
import getPoolGroupStats from '../core/getPoolGroupStats'
import { serializePoolGroupStats } from '../entities'
import failure from '../utils/failure'
import { getBlockchainFilter } from '../utils/query'

const router = Router()

router.get('/:collectionAddress/pools', async (req, res, next) => {
  try {
    const collectionAddress = req.params.collectionAddress
    const blockchainFilter = getBlockchainFilter(req.query, true)
    const pools = await getPoolGroupStats({ blockchainFilter, collectionAddress })
    const payload = serializePoolGroupStats(pools[0])
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_POOL_GROUP_STATS_FAILURE', err))
  }
})

export default router
