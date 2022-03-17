import Blockchain from '../entities/lib/Blockchain'
import failure from '../utils/failure'
import getPoolContract from './getPoolContract'

type Params = {
  blockchain: Blockchain
  nftId: string
  poolAddress: string
}

export default async function getLoanEvent({ blockchain, nftId, poolAddress }: Params) {
  try {
    const contract = await getPoolContract({ blockchain, poolAddress })
    const func = '_loans'
    const params = [nftId]
    const position = await contract.methods[func].apply(undefined, params).call()

    return position
  }
  catch (err) {
    throw failure('FETCH_LOAN_EVENTS_FAILURE', err)
  }
}
