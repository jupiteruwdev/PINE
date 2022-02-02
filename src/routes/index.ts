import { Router } from 'express'
import poolsRouter from './pools'
import statsRouter from './stats'

const router = Router()

router.use('/stats', statsRouter)
router.use('/pools', poolsRouter)

export default router
