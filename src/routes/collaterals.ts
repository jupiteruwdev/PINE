import { Router } from 'express'
import getNFTsByOwner from '../core/getNFTsByOwner'
import { NFT, serializeEntityArray } from '../entities'
import failure from '../utils/failure'
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
    next(failure('FETCH_COLLATERALS_FAILURE', err))
  }
})

export default router
