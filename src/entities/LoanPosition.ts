import NFT from './NFT'
import Valuation from './Valuation'
import Value from './Value'

type LoanPosition = {
  accuredInterest: Value
  borrowed: Value
  borrowerAddress: string
  expiresAt: number
  interestBPSPerBlock: number
  loanStartBlock: number
  maxLTVBPS: number
  nft: NFT
  outstanding: Value
  poolAddress: string
  returned: Value
  repaidInterest: Value
  valuation: Valuation
}

export default LoanPosition
