import { Web3Options } from '../utils/ethereum'
import getPoolContract from './getPoolContract'

export default async function getCollateralLoanPosition(nftId: number, poolAddress: string, options: Web3Options = {}) {
  const poolContract = getPoolContract(poolAddress, options)
  const func = '_loans'
  const params = [nftId]
  const position = await poolContract.methods[func].apply(undefined, params).call()

  return position
}
