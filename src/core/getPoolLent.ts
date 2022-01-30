import _ from 'lodash'
import { getWeb3, Web3Options } from '../utils/ethereum'
import { getPoolLoanEvents } from './getPoolLoanEvents'

export default async function getPoolLent(poolAddress: string, options: Web3Options = {}): Promise<number> {
  const web3 = getWeb3(options)
  const events = await getPoolLoanEvents(poolAddress, options)
  const lentEthPerEvent = events.map(event => parseFloat(web3.utils.fromWei(event.returnValues.loan[4])))
  const totalLentEth = _.sum(lentEthPerEvent)

  return totalLentEth
}
