import { RequestHandler } from 'express'
import getCollectionValuation from '../../core/getCollectionValuation'
import failure from '../../utils/failure'
import logger from '../../utils/logger'

export default function getValuation(): RequestHandler {
  return async (req, res, next) => {
    const collection = req.query.collection?.toString()
    const matches = collection?.match(/(.*):(.*)/)

    if (!matches) return next(failure('UNSUPPORTED_COLLECTION'))

    const venue = matches[1]
    const collectionId = matches[2]

    try {
      logger.info(`Fetching valuation for collection ID <${collectionId}> from venue <${venue}>...`)

      const payload = await getCollectionValuation({ venue, collectionId })

      logger.info(`Fetching valuation for collection ID <${collectionId}> from venue <${venue}>... OK`)

      res.status(200).json(payload)
    }
    catch (err) {
      logger.info(`Fetching valuation for collection ID <${collectionId}> from venue <${venue}>... ERR: ${err}`)

      next(failure('VALUATION_FAILURE', err))
    }
  }
}
