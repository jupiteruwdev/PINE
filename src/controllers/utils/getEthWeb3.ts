import _ from 'lodash'
import Web3 from 'web3'
import appConf from '../../app.conf'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'

const web3s: Record<string, Web3 | undefined> = {
  [Blockchain.Ethereum.Network.MAIN]: undefined,
  [Blockchain.Ethereum.Network.ROPSTEN]: undefined,
  [Blockchain.Ethereum.Network.RINKEBY]: undefined,
  [Blockchain.Ethereum.Network.GOERLI]: undefined,
  [Blockchain.Ethereum.Network.KOVAN]: undefined,
  [Blockchain.Polygon.Network.MAIN]: undefined,
  [Blockchain.Polygon.Network.MUMBAI]: undefined,
}

export default function getEthWeb3(networkId: string = Blockchain.Ethereum.Network.MAIN) {
  try {
    if (web3s[networkId] !== undefined) return web3s[networkId] as Web3

    const rpc = _.get(appConf.ethRPC, networkId)

    if (!rpc) throw fault('ERR_ETH_UNSUPPORTED_RPC', `No RPC set up for network ID ${networkId}`)

    const web3 = new Web3(rpc)
    web3s[networkId] = web3

    return web3
  }
  catch (err) {
    throw fault('ERR_GET_ETH_WEB3', undefined, err)
  }
}
