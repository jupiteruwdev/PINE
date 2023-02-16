import { Router } from 'express'
import { getGlobalStats, getUserMissionStats } from '../../controllers'
import { GlobalStats } from '../../entities'
import UserMissionStats from '../../entities/lib/UserMissionStats'
import { turnstileMiddleware } from '../../middlewares'
import fault from '../../utils/fault'
import { getBlockchain, getBlockchainFilter, getNumber, getString } from '../utils/query'

const router = Router()

router.get('/global', async (req, res, next) => {
  try {
    const blockchainFilter = getBlockchainFilter(req.query, false)
    const stats = await getGlobalStats({ blockchainFilter })
    const payload = GlobalStats.serialize(stats)

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30')
    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_GLOBAL_STATS', undefined, err))
  }
})

router.get('/user/:address', turnstileMiddleware, async (req, res, next) => {
  try {
    const blockchain = getBlockchain(req.query)
    const address = getString(req.params, 'address')
    const timestamp = getNumber(req.query, 'timestamp', { optional: true })

    const stats = await getUserMissionStats({ blockchain, address, timestamp })
    const payload = UserMissionStats.serialize(stats)

    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_USER_STATS', undefined, err))
  }
})

export default router
