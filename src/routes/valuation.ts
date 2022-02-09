import { Router } from 'express'
import getCollectionValuation from '../core/getCollectionValuation'
import failure from '../utils/failure'

const router = Router()

router.get('/', async (req, res, next) => {
  const collection = req.query.collection?.toString()
  const matches = collection?.match(/(.*):(.*)/)
  const venue = matches?.[1]
  const collectionId = matches?.[2]

  if (!venue || !collectionId) return next(failure('UNSUPPORTED_COLLECTION'))

  try {
    const payload = await getCollectionValuation({ venue, collectionId })
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('VALUATION_FAILURE', err))
  }
})

export default router
