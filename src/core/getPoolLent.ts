import _ from 'lodash'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import Value, { $ETH } from '../entities/Value'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'
import { getPoolLoanEvents } from './getPoolLoanEvents'

type Params = {
  poolAddress: string
}

/**
 * Fetches the total value lent for the pool at the provided address. Note the difference between
 * lent value and utilization value ({@link getPoolUtilization}): lent refers to the initial loan
 * amount and utilization refers to the current outstanding loan amount.
 *
 * @param param - See {@link Params}.
 * @param blockchain - The blockchain of which the pool resides.
 *
 * @returns The total value lent for the pool.
 */
export default async function getPoolLent({ poolAddress }: Params, blockchain: Blockchain = EthBlockchain()): Promise<Value> {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getEthWeb3(blockchain.networkId)
    const events = await getPoolLoanEvents({ poolAddress }, blockchain)
    const lentEthPerEvent = events.map(event => parseFloat(web3.utils.fromWei(event.returnValues.loan[4])))
    const totalLentEth = _.sum(lentEthPerEvent)

    return $ETH(totalLentEth)
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
