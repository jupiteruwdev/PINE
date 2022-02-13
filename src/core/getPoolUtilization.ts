import _ from 'lodash'
import Blockchain from '../entities/Blockchain'
import { $ETH } from '../entities/Value'
import failure from '../utils/failure'
import getCollateralOutstanding from './getCollateralOutstanding'
import getPoolHistoricalCollateralIds from './getPoolHistoricalCollateralIds'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

export default async function getPoolUtilization({ blockchain, poolAddress }: Params) {
  switch (blockchain.network) {
  case 'ethereum': {
    const collaterals = await getPoolHistoricalCollateralIds({ blockchain, poolAddress })
    const utilizationPerCollateral = await Promise.all(collaterals.map(nftId => getCollateralOutstanding({ blockchain, nftId, poolAddress })))
    const totalUtilization = _.sumBy(utilizationPerCollateral, t => t.amount)

    return $ETH(totalUtilization)
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
