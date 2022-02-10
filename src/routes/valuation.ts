import { Router } from 'express'
import getCollectionValuation from '../core/getCollectionValuation'
import failure from '../utils/failure'

const router = Router()

router.get('/', async (req, res, next) => {
  const collectionId = req.query.collection?.toString() ?? ''

  try {
    const payload = await getCollectionValuation({ collectionId })
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('VALUATION_FAILURE', err))
  }
})

export default router
