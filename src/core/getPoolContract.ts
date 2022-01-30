import ERC721LendingABI from '../abis/ERC721Lending.json'
import { getWeb3, Web3Options } from '../utils/ethereum'

export default function getPoolContract(address: string, options: Web3Options = {}) {
  const web3 = getWeb3(options)
  const contract = new web3.eth.Contract(ERC721LendingABI as any, address)

  return contract
}
