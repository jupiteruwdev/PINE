import { Router } from 'express'
import btcRouter from './btc'
import collateralsRouter from './collaterals'
import collectionsRouter from './collections'
import loansRouter from './loans'
import poolsRouter from './pools'
import redisRouter from './redis'
import statsRouter from './stats'
import termsRouter from './terms'

const router = Router()

router.use('/collaterals', collateralsRouter)
router.use('/collections', collectionsRouter)
router.use('/loans', loansRouter)
router.use('/pools', poolsRouter)
router.use('/stats', statsRouter)
router.use('/terms', termsRouter)
router.use('/btc', btcRouter)
router.use('/redis', redisRouter)

export default router
