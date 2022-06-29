import BigNumber from 'bignumber.js'
import { Router } from 'express'
import getExistingLoan from '../core/getExistingLoan'
import getLoanTerms from '../core/getLoanTerms'
import getPNPLTermsByUrl from '../core/getPNPLTermsByUrl'
import getRolloverTerms from '../core/getRolloverTerms'
import { LoanTerms, PNPLTerms, RolloverTerms } from '../entities'
import failure from '../utils/failure'
import { getBlockchain, getString } from '../utils/query'

const router = Router()

router.get('/borrow', async (req, res, next) => {
  try {
    const nftId = getString(req.query, 'nftId')
    const collectionId = getString(req.query, 'collectionId')
    const blockchain = getBlockchain(req.query)
    const loanTerms = await getLoanTerms({ blockchain, nftId, collectionId })
    const payload = LoanTerms.serialize(loanTerms)
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('ERR_API_FETCH_LOAN_TERMS', err))
  }
})

router.get('/rollover', async (req, res, next) => {
  try {
    const nftId = getString(req.query, 'nftId')
    const collectionId = getString(req.query, 'collectionId')
    const blockchain = getBlockchain(req.query)
    const existingLoan = await getExistingLoan({ blockchain, nftId, collectionId })
    const canRollover = new BigNumber(existingLoan?.borrowedWei).gt(new BigNumber(existingLoan?.returnedWei))

    if (!canRollover) next(failure('ERR_INVALID_ROLLOVER'))

    const loanTerms = await getRolloverTerms({ blockchain, nftId, collectionId, existingLoan })
    const payload = RolloverTerms.serialize(loanTerms)
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('ERR_API_FETCH_ROLLOVER_TERMS', err))
  }
})

router.get('/finance', async (req, res, next) => {
  try {
    const url = getString(req.query, 'url')
    const parsedURL = new URL(url)
    let pnplTerms

    try {
      pnplTerms = await getPNPLTermsByUrl({ parsedURL })
    }
    catch (err) {
      return next(err)
    }

    const payload = PNPLTerms.serialize(pnplTerms)

    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('ERR_API_FETCH_PNPL_TERMS', err))
  }
})

export default router
