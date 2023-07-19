import BigNumber from 'bignumber.js'
import { logger } from 'ethers'
import _ from 'lodash'
import { AnyCurrency, Value } from '../../entities'
import fault from '../../utils/fault'
import DataSource from './DataSource'
import getRequest from './getRequest'

export default async function getPineValueUSD(amountPine: number | string | BigNumber = 1): Promise<Value<AnyCurrency>> {
  return DataSource.fetch(useGateIO(amountPine), useCoingecko(amountPine))
}

export function useGateIO(amountPine: number | string | BigNumber = 1): DataSource<Value<AnyCurrency>> {
  return async () => {
    try {
      logger.info('...using gate.io to fetch pine price')

      const data = await getRequest('https://data.gateapi.io/api2/1/ticker/pine_usdt')
        .catch(err => { throw fault('ERR_PINE_FETCH_USD_PRICE', undefined, err) })

      const price = new BigNumber(_.get(data, 'last'))
      const amount = new BigNumber(amountPine)

      return Value.$USD(amount.times(price))
    }
    catch (err) {
      throw fault('ERR_GET_PINE_VALUE_USD_USE_GATE_IO', undefined, err)
    }
  }
}

export function useCoingecko(amountPine: number | string | BigNumber = 1): DataSource<Value<AnyCurrency>> {
  return async () => {
    try {
      logger.info('... using coingecko to fetch pine price')

      const data = await getRequest('https://api.coingecko.com/api/v3/simple/price?ids=pine&vs_currencies=usd')
        .catch(err => { throw fault('ERR_PINE_FETCH_USD_PRICE', undefined, err) })

      const amount = new BigNumber(amountPine)
      const price = new BigNumber(_.get(data, ['pine', 'usd']))

      return Value.$USD(amount.times(price))
    }
    catch (err) {
      throw fault('ERR_GET_PINE_VALUE_USD_USE_COINGECKO', undefined, err)
    }
  }
}
