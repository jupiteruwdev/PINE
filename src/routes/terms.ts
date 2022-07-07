import BigNumber from 'bignumber.js'
import { Router } from 'express'
import { getExistingLoan, getLoanTerms, getPNPLTermsByUrl, getRolloverTerms } from '../controllers'
import { LoanTerms, PNPLTerms, RolloverTerms } from '../entities'
import fault from '../utils/fault'
import { getBlockchain, getString } from './utils/query'

const router = Router()

router.get('/borrow', async (req, res, next) => {
  try {
    const nftId = getString(req.query, 'nftId')
    const collectionAddress = getString(req.query, 'collectionAddress')
    const blockchain = getBlockchain(req.query)
    const loanTerms = await getLoanTerms({ blockchain, nftId, collectionAddress })
    const payload = LoanTerms.serialize(loanTerms)
    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_LOAN_TERMS', undefined, err))
  }
})

router.get('/rollover', async (req, res, next) => {
  try {
    const nftId = getString(req.query, 'nftId')
    const collectionAddress = getString(req.query, 'collectionAddress')
    const blockchain = getBlockchain(req.query)
    const existingLoan = await getExistingLoan({ blockchain, nftId, collectionAddress })
    const canRollover = new BigNumber(existingLoan?.borrowedWei).gt(new BigNumber(existingLoan?.returnedWei))

    if (!canRollover) next(fault('ERR_INVALID_ROLLOVER'))

    const loanTerms = await getRolloverTerms({ blockchain, nftId, collectionAddress, existingLoan })
    const payload = RolloverTerms.serialize(loanTerms)
    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_ROLLOVER_TERMS', undefined, err))
  }
})

router.get('/pnpl', async (req, res, next) => {
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
    next(fault('ERR_API_FETCH_PNPL_TERMS', undefined, err))
  }
})

export default router
