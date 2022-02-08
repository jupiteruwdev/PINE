import _ from 'lodash'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import { getPoolLoanEvents } from './getPoolLoanEvents'

export default async function getPoolCollaterals(poolAddress: string, blockchain: Blockchain = EthBlockchain()): Promise<number[]> {
  const events = await getPoolLoanEvents(poolAddress, blockchain)
  const nftIds = _.uniq(events.map(event => event.returnValues.nftID))
  return nftIds
}
