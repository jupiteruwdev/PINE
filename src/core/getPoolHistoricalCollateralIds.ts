import _ from 'lodash'
import { Blockchain } from '../entities'
import { getPoolHistoricalLoanEvents } from './getPoolHistoricalLoanEvents'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

export default async function getPoolHistoricalCollateralIds({ blockchain, poolAddress }: Params) {
  const events = await getPoolHistoricalLoanEvents({ blockchain, poolAddress })
  const nftIds = _.uniq(events.map(event => event.returnValues.nftID))

  return nftIds
}
