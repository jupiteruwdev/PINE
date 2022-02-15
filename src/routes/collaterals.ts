import { Router } from 'express'
import getNFTsByOwner from '../core/getNFTsByOwner'
import { EthBlockchain } from '../entities/lib/Blockchain'
import { parseEthNetworkId } from '../utils/ethereum'
import failure from '../utils/failure'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const ownerAddress = req.query.owner?.toString()
    const networkId = parseEthNetworkId(req.query.networkId)

    if (!ownerAddress) throw Error('Invalid owner address')

    const payload = await getNFTsByOwner({ blockchain: EthBlockchain(networkId), ownerAddress, populateMetadata: true })

    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_COLLATERALS_FAILURE', err))
  }
})

export default router
