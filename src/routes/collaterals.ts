import { Router } from 'express'
import getNFTsByOwner from '../core/getNFTsByOwner'
import { EthBlockchain } from '../entities/lib/Blockchain'
import { serializeNFTs } from '../entities/lib/NFT'
import tryOrUndefined from '../entities/lib/utils/tryOrUndefined'
import failure from '../utils/failure'
import mapReqToBlockchain from '../utils/mapReqToBlockchain'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const ownerAddress = req.query.owner?.toString()
    const blockchain = tryOrUndefined(() => mapReqToBlockchain(req)) ?? EthBlockchain()

    if (!ownerAddress) throw Error('Invalid owner address')

    const collaterals = await getNFTsByOwner({ blockchain, ownerAddress, populateMetadata: true })
    const payload = serializeNFTs(collaterals)

    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_COLLATERALS_FAILURE', err))
  }
})

export default router
