import Collection from './Collection'
import LoanOption from './LoanOption'
import NFT from './NFT'
import Valuation from './Valuation'

type LoanTerms = {
  collection: Collection
  contractAddress: string
  expiresAtBlock: number
  issuedAtBlock: number
  nft: NFT
  options: LoanOption[]
  signature: string
  valuation: Valuation
}

export default LoanTerms
