import { Router } from 'express'
import getGlobalStats from '../core/getGlobalStats'
import { GlobalStats } from '../entities'
import failure from '../utils/failure'
import { getBlockchainFilter } from '../utils/query'

const router = Router()

router.get('/global', async (req, res, next) => {
  try {
    const blockchainFilter = getBlockchainFilter(req.query, true)
    const stats = await getGlobalStats({ blockchainFilter })
    const payload = GlobalStats.serialize(stats)

    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_GLOBAL_STATS_FAILURE', err))
  }
})

export default router
