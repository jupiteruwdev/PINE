import { Router } from 'express'
import { getMagicEdenCollectionFloorPrice } from '../../controllers'
import fault from '../../utils/fault'
import { getString } from '../utils/query'

const router = Router()

router.get('/collection-floor-price', async (req, res, next) => {
  try {
    const collectionId = getString(req.query, 'id')

    const floorPrice = await getMagicEdenCollectionFloorPrice({ collectionId })

    res.status(200).send({ floorPrice })
  }
  catch (err) {
    next(fault('ERR_API_BTC_COLLECTION_FLOOR_PRICE', undefined, err))
  }
})

export default router
