import _ from 'lodash'
import { EthBlockchain } from './Blockchain'
import Currency, { AnyCurrency } from './Currency'

type Value<T extends AnyCurrency = AnyCurrency> = {
  amount: number
  currency: Currency<T>
}

export default Value

export function $USD(amount: number | string): Value<'USD'> {
  return {
    amount: _.toNumber(amount),
    currency: {
      name: 'USD',
    },
  }
}

export function $ETH(amount: number | string): Value<'ETH'> {
  return {
    amount: _.toNumber(amount),
    currency: {
      blockchain: EthBlockchain(),
      name: 'ETH',
    },
  }
}

export function $WEI(amount: number | string): Value<'WEI'> {
  return {
    amount: _.toNumber(amount),
    currency: {
      name: 'WEI',
    },
  }
}
