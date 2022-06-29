import { Router } from 'express'
import _ from 'lodash'
import getEthCollectionFloorPriceBatch from '../core/getEthCollectionFloorPriceBatch'
import { serializeEntityArray, Valuation } from '../entities'
import failure from '../utils/failure'
import { getBlockchainFilter } from '../utils/query'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const collectionAddresses = req.query.collectionAddresses
    if (!_.isArray(collectionAddresses)) throw failure('ERR_INVALID_COLLECTION_ADDRESSES')
    if (!((c: any): c is string[] => _.every(c, (e: any) => _.isString(e)))(collectionAddresses)) throw failure('ERR_INVALID_COLLECTION_ADDRESS')
    const blockchainFilter = getBlockchainFilter(req.query, false)
    const prices = await getEthCollectionFloorPriceBatch({ blockchainFilter, collectionAddresses })
    const payload = serializeEntityArray(prices, Valuation.codingResolver)
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('ERR_API_FETCH_VALUATIONS', err))
  }
})

export default router
