import { Router } from 'express'
import _ from 'lodash'
import { getEthCollectionFloorPrices, searchCollections } from '../../controllers'
import { Blockchain, Collection, serializeEntityArray, Value } from '../../entities'
import fault from '../../utils/fault'
import { getBlockchain, getBlockchainFilter, getString } from '../utils/query'

const router = Router()

router.get('/search', async (req, res, next) => {
  try {
    const blockchain = getBlockchain(req.query)
    const query = getString(req.query, 'query')
    const collections = await searchCollections({ blockchain, query })
    const payload = serializeEntityArray(collections, Collection.codingResolver)
    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_SEARCH_COLLECTIONS', undefined, err))
  }
})

router.get('/floors', async (req, res, next) => {
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
