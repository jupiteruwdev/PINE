import { Router } from 'express'
import getActiveLoanStatsByCollection from '../core/getActiveLoanStatsByCollection'
import getObligations from '../core/getObligations'
import { EthBlockchain, serializeActiveLoanStats, serializeEntityArray } from '../entities'
import { serializeCollateralizedNFT } from '../entities/lib/CollateralizedNFT'
import failure from '../utils/failure'
import { getBlockchain, getString } from '../utils/query'
import tryOrUndefined from '../utils/tryOrUndefined'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const borrowerAddress = getString(req.query, 'owner')
    const blockchain = getBlockchain(req.query)
    const obligations = await getObligations({ blockchain, borrowerAddress })
    const payload = serializeEntityArray(obligations, serializeCollateralizedNFT)

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
    const obligation = await getActiveLoanStatsByCollection({ collectionAddress, blockchain })
    const payload = serializeEntityArray(obligation, serializeActiveLoanStats)
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_OBLIGATIONS_FAILURE', err))
  }
})

export default router
