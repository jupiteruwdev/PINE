import { Router } from 'express'
import collateralsRouter from './collaterals'
import loansRouter from './loans'
import poolsRouter from './pools'
import statsRouter from './stats'
import termsRouter from './terms'
import valuationsRouter from './valuations'

const router = Router()

router.use('/collaterals', collateralsRouter)
router.use('/loans', loansRouter)
router.use('/pools', poolsRouter)
router.use('/stats', statsRouter)
router.use('/terms', termsRouter)
router.use('/valuations', valuationsRouter)

export default router
