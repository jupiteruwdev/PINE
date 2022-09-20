import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { AnyCurrency, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import DataSource from './DataSource'
import getRequest from './getRequest'

export default async function getEthValueUSD(amountEth: number | string | BigNumber = 1) {
  return DataSource.fetch(useBinance(amountEth), useCoingecko(amountEth))
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
