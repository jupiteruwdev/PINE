import Currency from './Currency'

/**
 * @todo Use `Collection` entity instead of `collection_id`.
 */
type Valuation = {
  collection_id: string
  currency_price_usd_24hr: number
  currency_price_usd: number
  currency: Currency
  updated_at: Date
  value_24hr: number
  value_usd_24hr: number
  value_usd: number
  value: number
}

export default Valuation
