import BigNumber from 'bignumber.js'
import _ from 'lodash'
import Web3 from 'web3'
import appConf from '../app.conf'
import { Blockchain, Value } from '../entities'
import failure from './failure'
import getRequest from './getRequest'

const web3s: Record<string, Web3 | undefined> = {
  [Blockchain.Ethereum.Network.MAIN]: undefined,
  [Blockchain.Ethereum.Network.ROPSTEN]: undefined,
  [Blockchain.Ethereum.Network.RINKEBY]: undefined,
  [Blockchain.Ethereum.Network.GOERLI]: undefined,
  [Blockchain.Ethereum.Network.KOVAN]: undefined,
}

export function getEthWeb3(networkId: string = Blockchain.Ethereum.Network.MAIN) {
  if (web3s[networkId] !== undefined) return web3s[networkId] as Web3

  const rpc = _.get(appConf.ethRPC, networkId)

  if (!rpc) throw failure('UNSUPPORTED_RPC')

  const web3 = new Web3(rpc)
  web3s[networkId] = web3

  return web3
}

export async function getEthValueUSD(amountEth: number | string | BigNumber = 1) {
  try {
    const data = await getRequest('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT')
    const amount = new BigNumber(amountEth)
    const price = new BigNumber(_.get(data, 'price'))

    return Value.$USD(amount.times(price))
  }
  catch (err) {
    throw failure('FETCH_ETH_USD_PRICE_FAILURE', err)
  }
}

export async function getEthValueUSD24Hr(amountEth: number | string | BigNumber = 1) {
  try {
    const data = await getRequest('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT')
    const amount = new BigNumber(amountEth)
    const price = new BigNumber(_.get(data, 'prevClosePrice'))

    return Value.$USD(amount.times(price))
  }
  catch (err) {
    throw failure('FETCH_ETH_USD_24HR_PRICE_FAILURE', err)
  }
}

export async function getEthBlockNumber(networkId: string = Blockchain.Ethereum.Network.MAIN): Promise<number> {
  const web3 = getEthWeb3(networkId)
  const blockNumber = await web3.eth.getBlockNumber()

  return blockNumber
}

export function parseEthNetworkId(value: any): string {
  return _.toString(_.toNumber(value))
}
