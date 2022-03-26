import { Router } from 'express'
import getCollectionValuation from '../core/getCollectionValuation'
import { EthBlockchain } from '../entities/lib/Blockchain'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import { serializeValuation } from '../entities/lib/Valuation'
import { parseEthNetworkId } from '../utils/ethereum'
import failure from '../utils/failure'
import { findOne as findOneCollection } from '../db/collections'
import Collection from '../entities/lib/Collection'

const router = Router()

router.get('/', async (req, res, next) => {
  const address = req.query.collection_address?.toString() ?? ''
  const networkId = parseEthNetworkId(req.query.networkId ?? EthereumNetwork.MAIN)
  const collection: Collection = await findOneCollection({ address, blockchain: EthBlockchain(networkId) }) ?? {
    address,
    blockchain: EthBlockchain(networkId),
    id: '',
    name: '',
  }

  try {
    const valuation = await getCollectionValuation({ collection })
    const payload = serializeValuation(valuation)
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('VALUATION_FAILURE', err))
  }
})

export default router
