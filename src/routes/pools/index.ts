import { Router } from 'express'
import getEthLoanPool from './getEthLoanPool'

const router = Router()

router.get('/eth/:address', getEthLoanPool())

export default router
