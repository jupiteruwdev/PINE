import Currency from './Currency'

/**
 * @todo Use `Collection` entity instead of `collection_id`.
 */
type Valuation = {
  collection_id: string
  currency_usd_24hr: number
  currency_usd: number
  currency: Currency
  updated_at: Date
  valuation_24hr: number
  valuation_usd_24hr: number
  valuation_usd: number
  valuation: number
}

export default Valuation
