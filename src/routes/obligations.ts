import { Router } from 'express'
import getObligation from '../core/getObligation'
import getObligations from '../core/getObligations'
import { serializeActiveLoanStats } from '../entities/lib/ActiveLoanStat'
import { EthBlockchain } from '../entities/lib/Blockchain'
import { serializeNFTs } from '../entities/lib/NFT'
import failure from '../utils/failure'
import { getBlockchain, getString } from '../utils/query'
import tryOrUndefined from '../utils/tryOrUndefined'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const borrowerAddress = getString(req.query, 'owner')
    const blockchain = getBlockchain(req.query)
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
    const blockchain = tryOrUndefined(() => getBlockchain(req.query)) ?? EthBlockchain()
    const obligation = await getObligation({ collectionAddress, blockchain })
    const payload = serializeActiveLoanStats(obligation)
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_OBLIGATIONS_FAILURE', err))
  }
})

export default router
