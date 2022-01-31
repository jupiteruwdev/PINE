import _ from 'lodash'
import { Web3Options } from '../utils/ethereum'
import { getPoolLoanEvents } from './getPoolLoanEvents'

export default async function getPoolCollaterals(poolAddress: string, options: Web3Options = {}): Promise<number[]> {
  const events = await getPoolLoanEvents(poolAddress, options)
  const nftIds = _.uniq(events.map(event => event.returnValues.nftID))

  return nftIds
}
