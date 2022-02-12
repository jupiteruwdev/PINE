import _ from 'lodash'
import Blockchain from '../entities/Blockchain'
import { getPoolLoanEvents } from './getPoolLoanEvents'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

export default async function getPoolCollaterals({ blockchain, poolAddress }: Params) {
  const events = await getPoolLoanEvents({ blockchain, poolAddress })
  const nftIds = _.uniq(events.map(event => event.returnValues.nftID))
  return nftIds
}
