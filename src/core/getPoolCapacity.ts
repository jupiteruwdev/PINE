import { getWeb3, Web3Options } from '../utils/ethereum'

export default async function getPoolCapacity(poolAddress: string, options: Web3Options = {}): Promise<number> {
  const web3 = getWeb3(options)
  const balanceWei = await web3.eth.getBalance(poolAddress)
  const balanceEth = parseFloat(web3.utils.fromWei(balanceWei))

  return balanceEth
}
