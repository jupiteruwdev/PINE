import { Router } from 'express'
import getNFTsByOwner from '../controllers/getNFTsByOwner'
import { NFT, serializeEntityArray } from '../entities'
import fault from '../utils/fault'
import { getBlockchain, getString } from '../utils/query'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const blockchain = getBlockchain(req.query)
    const ownerAddress = getString(req.query, 'owner')
    const collaterals = await getNFTsByOwner({ blockchain, ownerAddress, populateMetadata: true })
    const payload = serializeEntityArray(collaterals, NFT.codingResolver)

    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_COLLATERALS', undefined, err))
  }
})

export default router
