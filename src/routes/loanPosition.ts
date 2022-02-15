import { Router } from 'express'
import _ from 'lodash'
import getLoanPosition from '../core/getLoanPosition'
import { EthBlockchain } from '../entities/lib/Blockchain'
import { serializeLoanPosition } from '../entities/lib/LoanPosition'
import { parseEthNetworkId } from '../utils/ethereum'
import failure from '../utils/failure'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const nftId = req.query.nftId?.toString()
    const collectionId = req.query.collectionId?.toString()

    if (!nftId || !collectionId) throw failure('INVALID_PARAMS')

    const txSpeedBlocks = _.toNumber(req.query.txSpeedBlocks ?? 0)
    const networkId = parseEthNetworkId(req.query.networkId)
    const loanPosition = await getLoanPosition({ blockchain: EthBlockchain(networkId), nftId, collectionId, txSpeedBlocks })
    const payload = serializeLoanPosition(loanPosition)

    res.status(200).json(payload)
  }
  catch (err) {
    next(err)
  }
})

export default router
