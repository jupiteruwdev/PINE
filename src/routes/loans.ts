import { Router } from 'express'
import _ from 'lodash'
import { getLoan, getLoans, getObligations } from '../controllers'
import { Blockchain, CollateralizedNFT, Loan, serializeEntityArray } from '../entities'
import fault from '../utils/fault'
import tryOrUndefined from '../utils/tryOrUndefined'
import { getBlockchain, getString } from './utils/query'

const router = Router()

router.get('/nft', async (req, res, next) => {
  try {
    const nftId = getString(req.query, 'nftId')
    const collectionAddress = getString(req.query, 'collectionAddress')
    const txSpeedBlocks = _.toNumber(req.query.txSpeedBlocks ?? 0)
    const blockchain = getBlockchain(req.query)
    const loan = await getLoan({ blockchain, nftId, collectionAddress, txSpeedBlocks })

    if (loan === undefined) {
      res.status(404).send()
    }
    else {
      const payload = Loan.serialize(loan)
      res.status(200).json(payload)
    }
  }
  catch (err) {
    next(fault('ERR_API_FETCH_LOAN_BY_NFT', undefined, err))
  }
})

/**
 * @todo This should return `Loan[]`
 */
router.get('/borrower', async (req, res, next) => {
  try {
    const borrowerAddress = getString(req.query, 'borrowerAddress')
    const blockchain = getBlockchain(req.query)
    const obligations = await getObligations({ blockchain, borrowerAddress })
    const payload = serializeEntityArray(obligations, CollateralizedNFT.codingResolver)

    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_LOANS_BY_BORROWER', undefined, err))
  }
})

/**
 * @todo This should return `Loan[]`
 */
router.get('/collection', async (req, res, next) => {
  try {
    const collectionAddress = getString(req.query, 'collectionAddress')
    const blockchain = tryOrUndefined(() => getBlockchain(req.query)) ?? Blockchain.Ethereum()
    const loans = await getLoans({ collectionAddress, blockchain })
    const payload = serializeEntityArray(loans, Loan.codingResolver)
    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_LOANS_BY_COLLECTION', undefined, err))
  }
})

export default router
