import BigNumber from 'bignumber.js'
import { Router } from 'express'
import getExistingLoan from '../core/getExistingLoan'
import getLoanTerms from '../core/getLoanTerms'
import getRolloverTerms from '../core/getRolloverTerms'
import { serializeLoanTerms } from '../entities/lib/LoanTerms'
import { serializeRolloverTerms } from '../entities/lib/RolloverTerms'
import failure from '../utils/failure'
import { getBlockchainFromQuery, getString } from '../utils/query'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const nftId = getString(req.query, 'nftId')
    const collectionId = getString(req.query, 'collectionId')
    const blockchain = getBlockchainFromQuery(req.query)
    const existingLoan = await getExistingLoan({ blockchain, nftId, collectionId })
    const isRollover = new BigNumber(existingLoan?.borrowedWei).gt(new BigNumber(existingLoan?.returnedWei))

    if (isRollover) {
      const loanTerms = await getRolloverTerms({ blockchain, nftId, collectionId, existingLoan })
      const payload = serializeRolloverTerms(loanTerms)
      res.status(200).json(payload)
    }
    else {
      const loanTerms = await getLoanTerms({ blockchain, nftId, collectionId })
      const payload = serializeLoanTerms(loanTerms)
      res.status(200).json(payload)
    }
  }
  catch (err) {
    next(failure('FETCH_LOAN_TERMS_FAILURE', err))
  }
})

export default router
