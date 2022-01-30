import { Router } from 'express'
import balancesRouter from './balances'
import statsRouter from './stats'

const router = Router()

router.use('/stats', statsRouter)
router.use('/balances', balancesRouter)

export default router
