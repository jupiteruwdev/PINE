import Blockchain from '../entities/Blockchain'
import failure from '../utils/failure'
import getPoolContract from './getPoolContract'

type Params = {
  blockchain: Blockchain
  nftId: string
  poolAddress: string
}

export default async function getCollateralLoanPosition({ blockchain, nftId, poolAddress }: Params) {
  try {
    const contract = getPoolContract({ blockchain, poolAddress })
    const func = '_loans'
    const params = [nftId]
    const position = await contract.methods[func].apply(undefined, params).call()

    return position
  }
  catch (err) {
    throw failure('FETCH_LOAN_FAILURE', err)
  }
}
