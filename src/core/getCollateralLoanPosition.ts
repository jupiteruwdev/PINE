import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import getPoolContract from './getPoolContract'

type Params = {
  nftId: string
  poolAddress: string
}

export default async function getCollateralLoanPosition({ nftId, poolAddress }: Params, blockchain: Blockchain = EthBlockchain()) {
  const contract = getPoolContract({ poolAddress }, blockchain)
  const func = '_loans'
  const params = [nftId]
  const position = await contract.methods[func].apply(undefined, params).call()

  return position
}
