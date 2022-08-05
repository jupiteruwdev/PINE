import { Router } from 'express'
import _ from 'lodash'
import { getEthCollectionFloorPrices } from '../../controllers'
import { Blockchain, serializeEntityArray, Value } from '../../entities'
import fault from '../../utils/fault'
import { getBlockchainFilter } from '../utils/query'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const collectionAddresses = req.query.collectionAddresses
    if (!_.isArray(collectionAddresses)) throw fault('ERR_INVALID_COLLECTION_ADDRESSES')
    if (!((c: any): c is string[] => _.every(c, (e: any) => _.isString(e)))(collectionAddresses)) throw fault('ERR_INVALID_COLLECTION_ADDRESSES')

    const blockchainFilter = getBlockchainFilter(req.query, false)
    const prices = await getEthCollectionFloorPrices({ blockchain: Blockchain.Ethereum(blockchainFilter.ethereum), collectionAddresses })
    const payload = serializeEntityArray(prices, Value.codingResolver)

    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_VALUATIONS', undefined, err))
  }
})

export default router
