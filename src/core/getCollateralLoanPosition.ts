import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import getPoolContract from './getPoolContract'

export default async function getCollateralLoanPosition(nftId: number, poolAddress: string, blockchain: Blockchain = EthBlockchain()) {
  const contract = getPoolContract(poolAddress, blockchain)
  const func = '_loans'
  const params = [nftId]
  const position = await contract.methods[func].apply(undefined, params).call()

  return position
}
