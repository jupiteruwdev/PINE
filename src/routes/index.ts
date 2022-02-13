import { Router } from 'express'
import collateralsRouter from './collaterals'
import loanPositionRouter from './loanPosition'
import loanTermsRouter from './loanTerms'
import obligationsRouter from './obligations'
import poolsRouter from './pools'
import statsRouter from './stats'
import valuationRouter from './valuation'

const router = Router()

router.use('/collaterals', collateralsRouter)
router.use('/loan-position', loanPositionRouter)
router.use('/loan-terms', loanTermsRouter)
router.use('/obligations', obligationsRouter)
router.use('/pools', poolsRouter)
router.use('/stats', statsRouter)
router.use('/valuation', valuationRouter)

export default router
