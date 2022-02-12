import Collection from './Collection'
import LoanOption from './LoanOption'
import Valuation from './Valuation'

type LoanTerms = {
  collection: Collection
  contractAddress: string
  expiresAtBlock: number
  issuedAtBlock: number
  options: LoanOption[]
  signature: string
  valuation: Valuation
}

export default LoanTerms
