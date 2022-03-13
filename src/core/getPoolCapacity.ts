import Blockchain from '../entities/lib/Blockchain'
import Value, { $ETH } from '../entities/lib/Value'
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
    try {
      const web3 = getEthWeb3(blockchain.networkId)
      // TODO: remove this one so that no need to call twice
      const contract = await getPoolContract({ blockchain, poolAddress })
      switch (contract.poolVersion) {
      case 1:
        const balanceWei = await web3.eth.getBalance(poolAddress)
        const balanceEth = web3.utils.fromWei(balanceWei)
        return $ETH(balanceEth)
      case 2:
        const tokenAddress = await contract.methods._supportedCurrency().call()
        const fundSource = await contract.methods._fundSource().call()
        const tokenContract = getTokenContract({ blockchain, address: tokenAddress })
        const balanceWethWei = await tokenContract.methods.balanceOf(fundSource).call()
        const balanceWEth = web3.utils.fromWei(balanceWethWei)
        return $ETH(balanceWEth)
      default:
        failure('BAD-POOL-VERSION')
      }
    }
    catch (err) {
      throw failure('FETCH_ETH_BALANCE_FAILURE', err)
    }
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
