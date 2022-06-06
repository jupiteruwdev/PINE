import { Router } from 'express'
import getNFTsByOwner from '../core/getNFTsByOwner'
import { serializeNFTs } from '../entities/lib/NFT'
import failure from '../utils/failure'
import { getBlockchainFromQuery, getString } from '../utils/query'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const blockchain = getBlockchainFromQuery(req.query)
    const ownerAddress = getString(req.query, 'owner')
    const collaterals = await getNFTsByOwner({ blockchain, ownerAddress, populateMetadata: true })
    const payload = serializeNFTs(collaterals)

    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_COLLATERALS_FAILURE', err))
  }
})

export default router
