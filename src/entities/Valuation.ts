import { AnyCurrency } from './Currency'
import Value from './Value'

/**
 * @todo Use `Collection` entity instead of `collection_id`.
 */
type Valuation<T extends AnyCurrency = AnyCurrency> = {
  collection_id: string
  value_24hr: Value<T>
  value: Value<T>
  updated_at: Date
}

export default Valuation
