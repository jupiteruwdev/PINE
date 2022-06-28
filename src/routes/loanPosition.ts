import { Router } from 'express'
import _ from 'lodash'
import getLoanPosition from '../core/getLoanPosition'
import { LoanPosition } from '../entities'
import failure from '../utils/failure'
import { getBlockchain, getString } from '../utils/query'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const nftId = getString(req.query, 'nftId')
    const collectionId = getString(req.query, 'collectionId')
    const txSpeedBlocks = _.toNumber(req.query.txSpeedBlocks ?? 0)
    const blockchain = getBlockchain(req.query)
    const loanPosition = await getLoanPosition({ blockchain, nftId, collectionId, txSpeedBlocks })

    if (loanPosition === undefined) {
      res.status(404).send()
    }
    else {
      const payload = LoanPosition.serialize(loanPosition)
      res.status(200).json(payload)
    }
  }
  catch (err) {
    next(failure('FETCH_LOAN_POSITION_FAILURE', err))
  }
})

export default router
