import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { AnyCurrency, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import DataSource from './DataSource'
import getRequest from './getRequest'
import { AvailableToken } from './getTokenUSDPrice'

export async function getEthValueUSD(amountEth: number | string | BigNumber = 1, symbol: Omit<AvailableToken, 'PINE'> = AvailableToken.ETH): Promise<Value<AnyCurrency>> {
  return DataSource.fetch(utils.useCoingecko(symbol, amountEth), utils.useBinance(symbol, amountEth), utils.useCoinAPI(symbol, amountEth))
}

export function useBinance(symbol: Omit<AvailableToken, 'PINE'> = 'eth', amountEth: number | string | BigNumber = 1): DataSource<Value<AnyCurrency>> {
  return async () => {
    try {
      logger.info(`...using binance to fetch ${symbol} price`)

      const data = await getRequest(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}USDT`)
        .catch(err => { throw fault('ERR_ETH_FETCH_USD_PRICE', undefined, err) })

      const amount = new BigNumber(amountEth)
      const price = new BigNumber(_.get(data, 'price'))

      return Value.$USD(amount.times(price))
    }
    catch (err) {
      throw fault('ERR_GET_ETH_VALUE_USD_USE_BINANCE', undefined, err)
    }
  }
}

export function useCoingecko(symbol: Omit<AvailableToken, 'PINE'> = 'eth', amountEth: number | string | BigNumber = 1): DataSource<Value<AnyCurrency>> {
  return async () => {
    try {
      logger.info(`... using coingecko to fetch ${symbol} price`)

      const id = symbol === 'eth' ? 'ethereum' : symbol === 'matic' ? 'matic-network' : ''

      const data = await getRequest(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`)
        .catch(err => { throw fault('ERR_ETH_FETCH_USD_PRICE', undefined, err) })

      const amount = new BigNumber(amountEth)
      const price = new BigNumber(_.get(data, [id, 'usd']))

      return Value.$USD(amount.times(price))
    }
    catch (err) {
      throw fault('ERR_GET_ETH_VALUE_USD_USE_COINGECKO', undefined, err)
    }
  }
}

export function useCoinAPI(symbol: Omit<AvailableToken, 'PINE'> = 'eth', amountEth: number | string | BigNumber = 1): DataSource<Value<AnyCurrency>> {
  return async () => {
    try {
      logger.info(`... using coinApi to fetch ${symbol} price`)

      const data = await getRequest(`https://rest.coinapi.io/v1/exchangerate/${symbol.toUpperCase()}/USD`, {
        headers: {
          'X-CoinAPI-Key': appConf.coinAPIKey,
        },
      })
        .catch(err => {
          throw fault('ERR_ETH_FETCH_USD_PRICE', undefined, err)
        })

      const amount = new BigNumber(amountEth)
      const price = new BigNumber(_.get(data, 'rate'))

      return Value.$USD(amount.times(price))
    }
    catch (err) {
      throw fault('ERR_GET_ETH_VALUE_USD_USE_COINAPI', undefined, err)
    }
  }
}

const utils = {
  useBinance,
  useCoingecko,
  useCoinAPI,
  getEthValueUSD,
}

export default utils
