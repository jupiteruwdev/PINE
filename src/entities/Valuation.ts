import Collection from './Collection'
import { AnyCurrency } from './Currency'
import Value from './Value'

type Valuation<T extends AnyCurrency = AnyCurrency> = {
  collection: Collection
  value24Hr: Value<T>
  value: Value<T>
  updatedAt: Date
}

export default Valuation
