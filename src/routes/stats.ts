import { Router } from 'express'
import getGlobalStats from '../core/getGlobalStats'

const router = Router()

router.get('/global', async (req, res, next) => {
  try {
    const payload = await getGlobalStats()
    res.status(200).json(payload)
  }
  catch (err) {
    next(err)
  }
})

export default router
