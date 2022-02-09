import { Router } from 'express'
import getGlobalStats from '../core/getGlobalStats'
import failure from '../utils/failure'

const router = Router()

router.get('/global', async (req, res, next) => {
  try {
    const payload = await getGlobalStats()
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_STATS_FAILURE', err))
  }
})

export default router
