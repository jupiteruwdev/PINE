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

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const nftId = req.query.nftId?.toString()
    const collectionId = req.query.collectionId?.toString()

    if (!nftId || !collectionId) throw failure('FETCH_LOAN_TERMS_FAILURE')

    const networkId = parseEthNetworkId(req.query.networkId)
    const existingLoan = await getExistingLoan({ blockchain: EthBlockchain(networkId), nftId, collectionId })
    if (new BigNumber(existingLoan?.borrowedWei).gt(new BigNumber(existingLoan?.returnedWei))) {
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
    next(err)
  }
})

export default router
