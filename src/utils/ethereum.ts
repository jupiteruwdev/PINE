import axios from 'axios'
import _ from 'lodash'
import Web3 from 'web3'
import appConf from '../app.conf'

export enum EthNetwork {
  MAIN = '1',
  ROPSTEN = '3',
  RINKEBY = '4',
  GOERLI = '5',
  KOVAN = '42',
}

const web3s: Record<string, Web3 | undefined> = {
  [EthNetwork.MAIN]: undefined,
  [EthNetwork.ROPSTEN]: undefined,
  [EthNetwork.RINKEBY]: undefined,
  [EthNetwork.GOERLI]: undefined,
  [EthNetwork.KOVAN]: undefined,
}

export function getWeb3(networkId: string = EthNetwork.MAIN): Web3 {
  if (web3s[networkId] !== undefined) return web3s[networkId] as Web3

  const rpc = _.get(appConf.ethRPC, networkId)

  if (!rpc) throw Error(`Unsupported RPC for network ${networkId}`)

  const web3 = new Web3(rpc)
  web3s[networkId] = web3

  return web3
}

export async function getEthPriceUSD(): Promise<number> {
  const { data } = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT')
  const price = _.toNumber(_.get(data, 'price'))

  return price
}

export async function getEthPriceUSD24Hr(): Promise<number> {
  const { data } = await axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT')
  const price = _.toNumber(_.get(data, 'prevClosePrice'))

  return price
}

export async function getEthBlockNumber(networkId: string = EthNetwork.MAIN): Promise<number> {
  const web3 = getWeb3(networkId)
  const blockNumber = await web3.eth.getBlockNumber()

  return blockNumber
}
