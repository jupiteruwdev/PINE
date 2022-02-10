import Collection from './Collection'
import { AnyCurrency } from './Currency'
import LoanOption from './LoanOption'
import Value from './Value'

type Pool<T extends AnyCurrency = AnyCurrency> = {
  address: string
  collection?: Collection
  loanOptions?: LoanOption[]
  utilization?: Value<T>
  valueLocked?: Value<T>
}

export default Pool
