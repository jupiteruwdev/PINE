import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { Value } from '../../entities'
import fault from '../../utils/fault'
import getRequest from './getRequest'

export default async function getEthValueUSD(amountEth: number | string | BigNumber = 1) {
  const data = await getRequest('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT')
    .catch(err => { throw fault('ERR_ETH_FETCH_USD_PRICE', undefined, err) })

  const amount = new BigNumber(amountEth)
  const price = new BigNumber(_.get(data, 'price'))

  return Value.$USD(amount.times(price))
}
