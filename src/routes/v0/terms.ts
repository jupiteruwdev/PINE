import { Router } from 'express'
import { getLoanTerms, getPNPLTermsByUrl, getRolloverTerms } from '../../controllers'
import { LoanTerms, PNPLTerms, RolloverTerms } from '../../entities'
import fault from '../../utils/fault'
import { getBlockchain, getString } from '../utils/query'

const router = Router()

router.get('/borrow', async (req, res, next) => {
  try {
    const nftId = getString(req.query, 'nftId')
    const collectionAddress = getString(req.query, 'collectionAddress')
    const poolAddress = getString(req.query, 'poolAddress', { optional: true })
    const blockchain = getBlockchain(req.query)
    const loanTerms = await getLoanTerms({ blockchain, nftIds: [nftId], collectionAddresses: [collectionAddress], poolAddresses: poolAddress ? [poolAddress] : undefined })
    const payload = LoanTerms.serialize(loanTerms[0])
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
    const poolAddress = getString(req.query, 'poolAddress', { optional: true })
    const blockchain = getBlockchain(req.query)
    const rolloverTerms = await getRolloverTerms({ blockchain, nftIds: [nftId], collectionAddresses: [collectionAddress], poolAddresses: poolAddress ? [poolAddress] : undefined })
    const payload = RolloverTerms.serialize(rolloverTerms[0])

    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_ROLLOVER_TERMS', undefined, err))
  }
})

router.get('/pnpl', async (req, res, next) => {
  try {
    const url = getString(req.query, 'url')
    const poolAddress = getString(req.query, 'poolAddress', { optional: true })
    const parsedURL = new URL(url)
    let pnplTerms

    try {
      pnplTerms = await getPNPLTermsByUrl({ parsedURLs: [parsedURL], poolAddresses: poolAddress ? [poolAddress] : undefined })
    }
    catch (err) {
      return next(err)
    }

    const payload = PNPLTerms.serialize(pnplTerms[0])

    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_PNPL_TERMS', undefined, err))
  }
})

export default router
