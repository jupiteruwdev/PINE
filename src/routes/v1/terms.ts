import { Router } from 'express'
import { getLoanTerms, getPNPLTermsByUrl, getRolloverTerms } from '../../controllers'
import { LoanTerms, PNPLTerms, RolloverTerms } from '../../entities'
import fault from '../../utils/fault'
import { getBlockchain } from '../utils/query'

const router = Router()

router.get('/borrow', async (req, res, next) => {
  try {
    const blockchain = getBlockchain(req.query)
    const nftIds = req.query.nftIds as string[]
    const collectionAddresses = req.query.collectionAddresses as string[]
    const poolAddresses = req.query.poolAddresses as string[]
    if (!nftIds || !collectionAddresses) return res.status(200).json([])
    if (nftIds.length !== collectionAddresses.length || poolAddresses?.length && poolAddresses?.length !== nftIds.length) {
      throw fault('ERR_API_FETCH_LOAN_TERMS', undefined, 'Invalid params')
    }

    const loanTerms = await getLoanTerms({ blockchain, nftIds, collectionAddresses, poolAddresses })
    const payload = loanTerms.map(loanTerm => LoanTerms.serialize(loanTerm))
    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_LOAN_TERMS', undefined, err))
  }
})

router.get('/rollover', async (req, res, next) => {
  try {
    const blockchain = getBlockchain(req.query)
    const nftIds = req.query.nftIds as string[]
    const collectionAddresses = req.query.collectionAddresses as string[]
    const poolAddresses = req.query.poolAddresses as string[]
    if (!nftIds || !collectionAddresses) return res.status(200).json([])
    if (nftIds.length !== collectionAddresses.length || poolAddresses?.length && poolAddresses?.length !== nftIds.length) {
      throw fault('ERR_API_FETCH_LOAN_TERMS', undefined, 'Invalid params')
    }
    const rolloverTerms = await getRolloverTerms({ blockchain, nftIds, collectionAddresses, poolAddresses })
    const payload = rolloverTerms.map(rolloverTerm => RolloverTerms.serialize(rolloverTerm))

    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_ROLLOVER_TERMS', undefined, err))
  }
})

router.get('/pnpl', async (req, res, next) => {
  try {
    const urls = req.query.urls as string[]
    const poolAddresses = req.query.poolAddresses as string[]
    let pnplTerms

    try {
      const parsedURLs = urls.map(url => new URL(url))
      pnplTerms = await getPNPLTermsByUrl({ parsedURLs, poolAddresses })
    }
    catch (err) {
      return next(err)
    }

    const payload = pnplTerms.map(pnplTerm => PNPLTerms.serialize(pnplTerm))

    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_PNPL_TERMS', undefined, err))
  }
})

export default router
