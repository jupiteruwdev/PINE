import { $ETH, Blockchain, Value } from '../entities'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'
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
      const balanceWei = await web3.eth.getBalance(poolAddress).catch(err => { throw failure('ETH_GET_BALANCE', err) })
      const balanceEth = web3.utils.fromWei(balanceWei)
      return $ETH(balanceEth)
    case 2:
      const tokenAddress = await contract.methods._supportedCurrency().call().catch((err: unknown) => { throw failure('CONTRACT_FUNC_SUPPORTED_CURRENCY', err) })
      const fundSource = await contract.methods._fundSource().call().catch((err: unknown) => { throw failure('CONTRACT_FUNC_FUND_SOURCE', err) })
      const tokenContract = getTokenContract({ blockchain, address: tokenAddress })
      const balanceWethWei = await tokenContract.methods.balanceOf(fundSource).call().catch((err: unknown) => { throw failure('CONTRACT_FUNC_FUND_SOURCE_BALANCE', err) })
      const balanceWEth = web3.utils.fromWei(balanceWethWei)
      return $ETH(balanceWEth)
    default:
      failure('BAD_POOL_VERSION')
    }
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
