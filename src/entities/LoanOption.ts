import Value from './Value'

type LoanOption = {
  interestBPSPerBlock: number
  interestBPSPerBlockOverride?: number
  loanDurationBlocks: number
  loanDurationSeconds: number
  maxBorrow?: Value
  maxLTVBPS: number
}

export default LoanOption
