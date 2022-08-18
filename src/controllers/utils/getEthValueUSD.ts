import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { AnyCurrency, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import DataSource from './DataSource'
import getRequest from './getRequest'

type EthValueCache = {
  price: Value<AnyCurrency> | undefined
  timestamp: number | undefined
}

let ehtValueCache: EthValueCache = {
  price: undefined,
  timestamp: undefined,
}

export default async function getEthValueUSD(amountEth: number | string | BigNumber = 1) {
  try {
    const now = new Date().getTime()

    if (ehtValueCache.price && ehtValueCache.timestamp && now - ehtValueCache.timestamp <= 60000) {
      return ehtValueCache.price
    }

    const dataSource = DataSource.compose(
      useBinance(amountEth),
      useCoingecko(amountEth)
    )

    const price = await dataSource.apply(undefined)

    ehtValueCache = {
      price,
      timestamp: now,
    }

    return price
  }
  catch (err) {
    logger.warn('get eth value usd ... WARN')

    throw err
  }
}

export function useBinance(amountEth: number | string | BigNumber = 1): DataSource<Value<AnyCurrency>> {
  return async () => {
    logger.info('...using binance to fetch eth price')

    const data = await getRequest('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT')
      .catch(err => { throw fault('ERR_ETH_FETCH_USD_PRICE', undefined, err) })

    const amount = new BigNumber(amountEth)
    const price = new BigNumber(_.get(data, 'price'))

    return Value.$USD(amount.times(price))
  }
}

export function useCoingecko(amountEth: number | string | BigNumber = 1): DataSource<Value<AnyCurrency>> {
  return async () => {
    logger.info('... using coingecko to fetch eth price')

    const data = await getRequest('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
      .catch(err => { throw fault('ERR_ETH_FETCH_USD_PRICE', undefined, err) })

    const amount = new BigNumber(amountEth)
    const price = new BigNumber(_.get(data, ['ethereum', 'usd']))

    return Value.$USD(amount.times(price))
  }
}
