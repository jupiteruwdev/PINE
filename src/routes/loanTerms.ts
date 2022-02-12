import { Router } from 'express'
import getLoanTerms from '../core/getLoanTerms'
import { EthBlockchain } from '../entities/Blockchain'
import { parseEthNetworkId } from '../utils/ethereum'
import failure from '../utils/failure'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const nftId = req.query.nftId?.toString()
    const collectionId = req.query.collectionId?.toString()

    if (!nftId || !collectionId) throw failure('INVALID_PARAMS')

    const networkId = parseEthNetworkId(req.query.networkId)
    const payload = await getLoanTerms({ nftId, collectionId }, EthBlockchain(networkId))

    res.status(200).json(payload)
  }
  catch (err) {
    next(err)
  }
})

export default router
