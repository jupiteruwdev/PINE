import { Router } from 'express'
import _ from 'lodash'
import getLoanPosition from '../core/getLoanPosition'
import Blockchain from '../entities/lib/Blockchain'
import { serializeLoanPosition } from '../entities/lib/LoanPosition'
import failure from '../utils/failure'
import { getBlockchainFilter, getString } from '../utils/query'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const nftId = getString(req.query, 'nftId')
    const collectionId = getString(req.query, 'collectionId')
    const txSpeedBlocks = _.toNumber(req.query.txSpeedBlocks ?? 0)
    const blockchain = getBlockchainFilter(req.query, false) as Blockchain
    const loanPosition = await getLoanPosition({ blockchain, nftId, collectionId, txSpeedBlocks })
    const payload = serializeLoanPosition(loanPosition)

    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_LOAN_POSITION_FAILURE', err))
  }
})

export default router
