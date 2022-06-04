import { Router } from 'express'
import getNFTsByOwner from '../core/getNFTsByOwner'
import { serializeNFTs } from '../entities/lib/NFT'
import failure from '../utils/failure'
import mapReqToBlockchain from '../utils/mapReqToBlockchain'
import { getString } from '../utils/query'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const ownerAddress = getString(req.query, 'owner')
    const blockchain = mapReqToBlockchain(req)
    const collaterals = await getNFTsByOwner({ blockchain, ownerAddress, populateMetadata: true })
    const payload = serializeNFTs(collaterals)

    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_COLLATERALS_FAILURE', err))
  }
})

export default router
