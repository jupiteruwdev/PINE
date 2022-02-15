import { Router } from 'express'
import getGlobalStats from '../core/getGlobalStats'
import { serializeGlobalStats } from '../entities/lib/GlobalStats'

const router = Router()

router.get('/global', async (req, res, next) => {
  try {
    const stats = await getGlobalStats({ blockchains: req.query })
    const payload = serializeGlobalStats(stats)
    res.status(200).json(payload)
  }
  catch (err) {
    next(err)
  }
})

export default router
