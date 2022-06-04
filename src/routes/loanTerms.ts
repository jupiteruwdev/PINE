import BigNumber from 'bignumber.js'
import { Router } from 'express'
import getExistingLoan from '../core/getExistingLoan'
import getLoanTerms from '../core/getLoanTerms'
import getRolloverTerms from '../core/getRolloverTerms'
import { EthBlockchain } from '../entities/lib/Blockchain'
import { serializeLoanTerms } from '../entities/lib/LoanTerms'
import { serializeRolloverTerms } from '../entities/lib/RolloverTerms'
import { parseEthNetworkId } from '../utils/ethereum'
import failure from '../utils/failure'
import { getString } from '../utils/query'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const nftId = getString(req.query, 'nftId')
    const collectionId = getString(req.query, 'collectionId')
    const networkId = parseEthNetworkId(req.query.networkId)
    const existingLoan = await getExistingLoan({ blockchain: EthBlockchain(networkId), nftId, collectionId })
    const isRollover = new BigNumber(existingLoan?.borrowedWei).gt(new BigNumber(existingLoan?.returnedWei))

    if (isRollover) {
      const loanTerms = await getRolloverTerms({ blockchain: EthBlockchain(networkId), nftId, collectionId, existingLoan })
      const payload = serializeRolloverTerms(loanTerms)
      res.status(200).json(payload)
    }
    else {
      const loanTerms = await getLoanTerms({ blockchain: EthBlockchain(networkId), nftId, collectionId })
      const payload = serializeLoanTerms(loanTerms)
      res.status(200).json(payload)
    }
  }
  catch (err) {
    next(failure('FETCH_LOAN_TERMS_FAILURE', err))
  }
})

export default router
