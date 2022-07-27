import { Router } from 'express'
import getCollectionsBySearchText from '../../controllers/collections/getCollectionsBySearchText'
import { Collection, serializeEntityArray } from '../../entities'
import fault from '../../utils/fault'
import { getBlockchain, getString } from '../utils/query'

const router = Router()

router.get('/search', async (req, res, next) => {
  try {
    const blockchain = getBlockchain(req.query)
    const searchText = getString(req.query, 'query')
    const collections = await getCollectionsBySearchText({ blockchain, searchText })
    const payload = serializeEntityArray(collections, Collection.codingResolver)
    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_COLLATERALS', undefined, err))
  }
})

export default router
