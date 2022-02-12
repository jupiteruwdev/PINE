import { Router } from 'express'
import getObligations from '../core/getObligations'
import { EthBlockchain } from '../entities/Blockchain'
import { parseEthNetworkId } from '../utils/ethereum'
import failure from '../utils/failure'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const borrowerAddress = req.query.owner?.toString()
    const networkId = parseEthNetworkId(req.query.networkId)

    if (!borrowerAddress) throw Error('Invalid owner address')

    const payload = await getObligations({ blockchain: EthBlockchain(networkId), borrowerAddress })

    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_OBLIGATIONS_FAILURE', err))
  }
})

export default router
