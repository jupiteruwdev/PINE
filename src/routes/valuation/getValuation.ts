import { RequestHandler } from 'express'
import getCollectionValuation from '../../core/getCollectionValuation'
import logger from '../../utils/logger'

export default function getValuation(): RequestHandler {
  return async (req, res) => {
    const collection = req.query.collection?.toString()
    const matches = collection?.match(/(.*):(.*)/)

    if (!matches) throw Error(`Unsupported collection provided: ${collection}`)

    const venue = matches[1]
    const collectionId = matches[2]

    logger.info(`Fetching valuation for collection ID <${collectionId}> from venue <${venue}>...`)

    const payload = await getCollectionValuation({ venue, collectionId })

    logger.info(`Fetching valuation for collection ID <${collectionId}> from venue <${venue}>... OK`)

    return res.status(200).json(payload)
  }
}
