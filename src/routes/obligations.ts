import { Router } from 'express'
import getObligation from '../core/getObligation'
import getObligations from '../core/getObligations'
import { serializeActiveLoanStats } from '../entities/lib/ActiveLoanStat'
import { EthBlockchain } from '../entities/lib/Blockchain'
import { serializeNFTs } from '../entities/lib/NFT'
import { parseEthNetworkId } from '../utils/ethereum'
import failure from '../utils/failure'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const borrowerAddress = req.query.owner?.toString()
    const networkId = parseEthNetworkId(req.query.networkId)

    if (!borrowerAddress) throw Error('Invalid owner address')

    const obligations = await getObligations({ blockchain: EthBlockchain(networkId), borrowerAddress })
    const payload = serializeNFTs(obligations)

    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_OBLIGATIONS_FAILURE', err))
  }
})

router.get('/:collectionAddress', async (req, res, next) => {
  try {
    const collectionAddress = req.params.collectionAddress
    const obligation = await getObligation({ collectionAddress })
    const payload = serializeActiveLoanStats(obligation)
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_OBLIGATIONS_FAILURE', err))
  }
})

export default router
