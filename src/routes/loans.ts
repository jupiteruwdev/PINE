import { Router } from 'express'
import _ from 'lodash'
import getActiveLoanStatsByCollection from '../core/getActiveLoanStatsByCollection'
import getLoanPosition from '../core/getLoanPosition'
import getObligations from '../core/getObligations'
import { ActiveLoanStats, Blockchain, CollateralizedNFT, LoanPosition, serializeEntityArray } from '../entities'
import failure from '../utils/failure'
import { getBlockchain, getString } from '../utils/query'
import tryOrUndefined from '../utils/tryOrUndefined'

const router = Router()

router.get('/nft', async (req, res, next) => {
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
    next(failure('ERR_API_FETCH_LOAN_POSITION_BY_NFT', err))
  }
})

/**
 * @todo This should return `LoanPosition[]`
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
    next(failure('ERR_API_FETCH_LOAN_POSITIONS_BY_BORROWER', err))
  }
})

/**
 * @todo This should return `LoanPosition[]`
 */
router.get('/collection', async (req, res, next) => {
  try {
    const collectionAddress = getString(req.query, 'collectionAddress')
    const blockchain = tryOrUndefined(() => getBlockchain(req.query)) ?? Blockchain.Ethereum()
    const obligation = await getActiveLoanStatsByCollection({ collectionAddress, blockchain })
    const payload = serializeEntityArray(obligation, ActiveLoanStats.codingResolver)
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('ERR_API_FETCH_LOAN_POSITIONS_BY_COLLECTION', err))
  }
})

export default router
