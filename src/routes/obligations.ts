import { Router } from 'express'
import getObligation from '../core/getObligation'
import getObligations from '../core/getObligations'
import { serializeActiveLoanStats } from '../entities/lib/ActiveLoanStat'
import Blockchain from '../entities/lib/Blockchain'
import { serializeNFTs } from '../entities/lib/NFT'
import failure from '../utils/failure'
import { getBlockchainFilter, getString } from '../utils/query'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const borrowerAddress = getString(req.query, 'owner')
    const blockchain = getBlockchainFilter(req.query, false) as Blockchain
    const obligations = await getObligations({ blockchain, borrowerAddress })
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
    const blockchain = getBlockchainFilter(req.query, false) as Blockchain
    const obligation = await getObligation({ collectionAddress, blockchain })
    const payload = serializeActiveLoanStats(obligation)
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_OBLIGATIONS_FAILURE', err))
  }
})

export default router
