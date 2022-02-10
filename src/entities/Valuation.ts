import { AnyCurrency } from './Currency'
import Value from './Value'

/**
 * @todo Use `Collection` entity instead of `collection_id`.
 */
type Valuation<T extends AnyCurrency = AnyCurrency> = {
  collectionId: string
  value24Hr: Value<T>
  value: Value<T>
  updatedAt: Date
}

export default Valuation
