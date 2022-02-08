import Collection from './Collection'
import Currency from './Currency'
import LoanOption from './LoanOption'

type Pool = {
  address: string
  collection?: Collection
  currency: Currency
  loan_options?: LoanOption[]
  value_lent: number
  value_locked: number
}

// type Pool = {
//   block_number: number
//   eth_capacity: number
//   eth_current_utilization: number
//   eth_tvl: number
//   utilization_ratio: number
// }

export default Pool
