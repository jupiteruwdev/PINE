import { Router } from 'express'
import getValuation from './getValuation'

const router = Router()

router.get('/', getValuation())

export default router
