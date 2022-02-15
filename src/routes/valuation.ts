import { Router } from 'express'
import getCollectionValuation from '../core/getCollectionValuation'
import { EthBlockchain } from '../entities/lib/Blockchain'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import { serializeValuation } from '../entities/lib/Valuation'
import { parseEthNetworkId } from '../utils/ethereum'
import failure from '../utils/failure'

const router = Router()

router.get('/', async (req, res, next) => {
  const collectionId = req.query.collection?.toString() ?? ''
  const networkId = parseEthNetworkId(req.query.networkId ?? EthereumNetwork.MAIN)

  try {
    const valuation = await getCollectionValuation({ blockchain: EthBlockchain(networkId), collectionId })
    const payload = serializeValuation(valuation)
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('VALUATION_FAILURE', err))
  }
})

export default router
