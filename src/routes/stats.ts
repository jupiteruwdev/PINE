import { Router } from 'express'
import getGlobalStats from '../core/getGlobalStats'
import { serializeGlobalStats } from '../entities/lib/GlobalStats'
import { getBlockchainFilter } from '../utils/query'

const router = Router()

router.get('/global', async (req, res, next) => {
  try {
    const blockchainFilter = getBlockchainFilter(req.query, true)
    const stats = await getGlobalStats({ blockchainFilter })
    const payload = serializeGlobalStats(stats)

    res.status(200).json(payload)
  }
  catch (err) {
    next(err)
  }
})

export default router
