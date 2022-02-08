import { Router } from 'express'
import getEthPool from './getEthPool'

const router = Router()

router.get('/eth/:address', getEthPool())

export default router
