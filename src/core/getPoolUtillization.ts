import _ from 'lodash'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import { $ETH } from '../entities/Currency'
import { getWeb3 } from '../utils/ethereum'
import { getPoolLoanEvents } from './getPoolLoanEvents'

type Params = {
  poolAddress: string
}

/**
 * Fetches the total utilization (a.k.a. total amount lent out) of a pool.
 *
 * @param params - See {@link Params}.
 * @param blockchain - The blockchain of which the pool resides in.
 *
 * @returns - See {@link Output}.
 */
export default async function getPoolUtilization({ poolAddress }: Params, blockchain: Blockchain = EthBlockchain()) {
  switch (blockchain.network) {
  case 'ethereum': {
    const events = await getPoolLoanEvents({ poolAddress }, blockchain)
    const web3 = getWeb3(blockchain.network_id)
    const lentEthPerEvent = events.map(event => parseFloat(web3.utils.fromWei(event.returnValues.loan[4])))
    const totalLentEth = _.sum(lentEthPerEvent)

    return {
      currency: $ETH(blockchain.network_id),
      value: totalLentEth,
    }
  }
  default:
    throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
