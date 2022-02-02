import { Router } from 'express'
import getGlobalStats from './getGlobalStats'

const router = Router()

router.get('/global', getGlobalStats())

export default router
