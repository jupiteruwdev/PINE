import { Router } from 'express'
import getCollectionValuation from '../core/getCollectionValuation'
import { EthBlockchain } from '../entities/Blockchain'
import { EthNetwork, parseEthNetworkId } from '../utils/ethereum'
import failure from '../utils/failure'

const router = Router()

router.get('/', async (req, res, next) => {
  const collectionId = req.query.collection?.toString() ?? ''
  const networkId = parseEthNetworkId(req.query.networkId ?? EthNetwork.MAIN)

  try {
    const payload = await getCollectionValuation({ blockchain: EthBlockchain(networkId), collectionId })
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('VALUATION_FAILURE', err))
  }
})

export default router
