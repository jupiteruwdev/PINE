import { Router } from 'express'
import balancesRouter from './balances'
import statsRouter from './stats'

const router = Router()

/**
 * @todo Use `/stats` and `balances` routes
 */
router.use('/global-stats', statsRouter)
router.use('/eth-balance', balancesRouter)

export default router
