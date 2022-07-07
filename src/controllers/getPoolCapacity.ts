import { Blockchain, Value } from '../entities'
import { getEthWeb3 } from '../utils/ethereum'
import fault from '../utils/fault'
import getPoolContract from './getPoolContract'
import getTokenContract from './getTokenContract'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

export default async function getPoolCapacity({ blockchain, poolAddress }: Params): Promise<Value> {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getEthWeb3(blockchain.networkId)
    // TODO: remove this one so that no need to call twice
    const contract = await getPoolContract({ blockchain, poolAddress })

    switch (contract.poolVersion) {
    case 1:
      const balanceWei = await web3.eth.getBalance(poolAddress).catch(err => { throw fault('ERR_ETH_GET_BALANCE', undefined, err) })
      const balanceEth = web3.utils.fromWei(balanceWei)
      return Value.$ETH(balanceEth)
    case 2:
      const tokenAddress = await contract.methods._supportedCurrency().call().catch((err: unknown) => { throw fault('ERR_CONTRACT_FUNC_SUPPORTED_CURRENCY', undefined, err) })
      const fundSource = await contract.methods._fundSource().call().catch((err: unknown) => { throw fault('ERR_CONTRACT_FUNC_FUND_SOURCE', undefined, err) })
      const tokenContract = getTokenContract({ blockchain, address: tokenAddress })
      const balanceWethWei = await tokenContract.methods.balanceOf(fundSource).call().catch((err: unknown) => { throw fault('ERR_CONTRACT_FUNC_FUND_SOURCE_BALANCE', undefined, err) })
      const balanceWEth = web3.utils.fromWei(balanceWethWei)
      return Value.$ETH(balanceWEth)
    default:
      fault('ERR_INVALID_POOL_VERSION')
    }
  }
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}
