import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { PriceModel } from '../../db'
import { AnyCurrency, Blockchain, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import DataSource from './DataSource'
import getRequest from './getRequest'

export default async function getEthValueUSD(blockchain: Blockchain, amountEth: number | string | BigNumber = 1) {
  const symbol = blockchain.network === 'ethereum' ? 'eth' : blockchain.network === 'polygon' ? 'matic' : ''
  const lastestPrice = await PriceModel.findOne({ name: symbol }).lean()
  const updatedAt = new Date(_.get(lastestPrice, 'updatedAt'))
  const now = Date.now()

  if (updatedAt.getTime() >= now - 60 * 5 * 1000) {
    return Value.factory({
      amount: lastestPrice?.value?.amount,
      currency: lastestPrice?.value?.currency,
    })
  }

  return DataSource.fetch(useCoingecko(symbol, amountEth), useBinance(symbol, amountEth), useCoinAPI(symbol, amountEth))
}

export function useBinance(symbol = 'eth', amountEth: number | string | BigNumber = 1): DataSource<Value<AnyCurrency>> {
  return async () => {
    logger.info(`...using binance to fetch ${symbol} price`)

    const data = await getRequest(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}USDT`)
      .catch(err => { throw fault('ERR_ETH_FETCH_USD_PRICE', undefined, err) })

    const amount = new BigNumber(amountEth)
    const price = new BigNumber(_.get(data, 'price'))

    return Value.$USD(amount.times(price))
  }
}

export function useCoingecko(symbol = 'eth', amountEth: number | string | BigNumber = 1): DataSource<Value<AnyCurrency>> {
  return async () => {
    logger.info(`... using coingecko to fetch ${symbol} price`)

    const id = symbol === 'eth' ? 'ethereum' : symbol === 'matic' ? 'matic-network' : ''

    const data = await getRequest(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`)
      .catch(err => { throw fault('ERR_ETH_FETCH_USD_PRICE', undefined, err) })

    const amount = new BigNumber(amountEth)
    const price = new BigNumber(_.get(data, [id, 'usd']))

    return Value.$USD(amount.times(price))
  }
}

export function useCoinAPI(symbol = 'eth', amountEth: number | string | BigNumber = 1): DataSource<Value<AnyCurrency>> {
  return async () => {
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
}
