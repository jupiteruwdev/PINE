import { Router } from 'express'
import getLoanTerms from '../core/getLoanTerms'
import { EthBlockchain } from '../entities/lib/Blockchain'
import { serializeLoanTerms } from '../entities/lib/LoanTerms'
import { parseEthNetworkId } from '../utils/ethereum'
import failure from '../utils/failure'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const nftId = req.query.nftId?.toString()
    const collectionId = req.query.collectionId?.toString()

    if (!nftId || !collectionId) throw failure('FETCH_LOAN_TERMS_FAILURE')

    const networkId = parseEthNetworkId(req.query.networkId)
    const loanTerms = await getLoanTerms({ blockchain: EthBlockchain(networkId), nftId, collectionId })
    const payload = serializeLoanTerms(loanTerms)

    res.status(200).json(payload)
  }
  catch (err) {
    next(err)
  }
})

export default router
