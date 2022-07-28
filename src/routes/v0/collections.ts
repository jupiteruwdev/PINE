import { Router } from 'express'
import searchCollections from '../../controllers/collections/searchCollections'
import { Collection, serializeEntityArray } from '../../entities'
import fault from '../../utils/fault'
import { getBlockchain, getString } from '../utils/query'

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

export default router
