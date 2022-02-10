import { EthBlockchain } from './Blockchain'
import Currency, { AnyCurrency } from './Currency'

type Value<T extends AnyCurrency = AnyCurrency> = {
  amount: number
  currency: Currency<T>
}

export default Value

export function $USD(amount: number): Value<'USD'> {
  return {
    amount,
    currency: {
      name: 'USD',
    },
  }
}

export function $ETH(amount: number): Value<'ETH'> {
  return {
    amount,
    currency: {
      blockchain: EthBlockchain(),
      name: 'ETH',
    },
  }
}
