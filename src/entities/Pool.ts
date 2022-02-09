import Collection from './Collection'
import { AnyCurrency } from './Currency'
import LoanOption from './LoanOption'
import Value from './Value'

type Pool<T extends AnyCurrency = AnyCurrency> = {
  address: string
  collection?: Collection
  loan_options?: LoanOption[]
  value_lent: Value<T>
  value_locked: Value<T>
}

export default Pool
