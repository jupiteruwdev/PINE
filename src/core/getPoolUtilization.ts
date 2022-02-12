import _ from 'lodash'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import { $ETH } from '../entities/Value'
import failure from '../utils/failure'
import getCollateralOutstanding from './getCollateralOutstanding'
import getPoolCollaterals from './getPoolCollaterals'

type Params = {
  poolAddress: string
}

/**
 * Fetches the current utilization for the pool at the provided address. Note the difference between
 * lent value ({@link getPoolLent}) and utilization value: lent refers to the initial loan
 * amount and utilization refers to the current outstanding loan amount.
 *
 * @param param - See {@link Params}.
 * @param blockchain - The blockchain of which the pool resides.
 *
 * @returns The current utilization for the pool.
 */
export default async function getPoolUtilization({ poolAddress }: Params, blockchain: Blockchain = EthBlockchain()) {
  switch (blockchain.network) {
  case 'ethereum': {
    const collaterals = await getPoolCollaterals({ poolAddress }, blockchain)
    const utilizationPerCollateral = await Promise.all(collaterals.map(nftId => getCollateralOutstanding({ nftId, poolAddress }, blockchain)))
    const totalUtilization = _.sumBy(utilizationPerCollateral, t => t.amount)

    return $ETH(totalUtilization)
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
