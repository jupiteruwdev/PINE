import { Router } from 'express'
import getObligation from '../core/getObligation'
import getObligations from '../core/getObligations'
import { serializeActiveLoanStats } from '../entities/lib/ActiveLoanStat'
import { EthBlockchain } from '../entities/lib/Blockchain'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import { serializeNFTs } from '../entities/lib/NFT'
import { parseEthNetworkId } from '../utils/ethereum'
import failure from '../utils/failure'
import { getString } from '../utils/query'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const borrowerAddress = getString(req.query, 'owner')
    const networkId = parseEthNetworkId(req.query.networkId)
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
    const networkId = parseEthNetworkId(req.query.networkId ?? EthereumNetwork.MAIN)

    const obligation = await getObligation({ collectionAddress, blockchain: EthBlockchain(networkId) })
    const payload = serializeActiveLoanStats(obligation)
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_OBLIGATIONS_FAILURE', err))
  }
})

export default router
