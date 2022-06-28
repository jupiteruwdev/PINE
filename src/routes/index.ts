import { Router } from 'express'
import appConf from '../app.conf'
import collateralsRouter from './collaterals'
import collectionsRouter from './collections'
import loanPositionRouter from './loanPosition'
import loanTermsRouter from './loanTerms'
import obligationsRouter from './obligations'
import pnplRouter from './pnpl'
import poolsRouter from './pools'
import statsRouter from './stats'

const router = Router()

router.get('/health', (req, res) => res.sendStatus(200))
router.get('/version', (req, res) => res.send(`${appConf.version}-${appConf.build}`))

router.use('/collaterals', collateralsRouter)
router.use('/collections', collectionsRouter)
router.use('/loan-position', loanPositionRouter)
router.use('/loan-terms', loanTermsRouter)
router.use('/obligations', obligationsRouter)
router.use('/pnpl', pnplRouter)
router.use('/pools', poolsRouter)
router.use('/stats', statsRouter)

export default router
