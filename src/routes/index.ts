import { Router } from 'express'
import appConf from '../app.conf'
import collateralsRouter from './collaterals'
import loansRouter from './loans'
import poolsRouter from './pools'
import statsRouter from './stats'
import termsRouter from './terms'
import valuationsRouter from './valuations'

const router = Router()

router.get('/health', (req, res) => res.sendStatus(200))
router.get('/version', (req, res) => res.send(`${appConf.version}-${appConf.build}`))

router.use('/collaterals', collateralsRouter)
router.use('/loans', loansRouter)
router.use('/pools', poolsRouter)
router.use('/stats', statsRouter)
router.use('/terms', termsRouter)
router.use('/valuations', valuationsRouter)

export default router
