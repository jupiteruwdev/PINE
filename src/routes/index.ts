import { Router } from 'express'
import collateralsRouter from './collaterals'
import poolsRouter from './pools'
import statsRouter from './stats'
import valuationRouter from './valuation'

const router = Router()

router.use('/stats', statsRouter)
router.use('/pools', poolsRouter)
router.use('/valuation', valuationRouter)
router.use('/collaterals', collateralsRouter)

export default router
