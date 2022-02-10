import _ from 'lodash'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import { $ETH } from '../entities/Value'
import getCollateralOutstanding from './getCollateralOutstanding'
import getPoolCollaterals from './getPoolCollaterals'

type Params = {
  poolAddress: string
}

export default async function getPoolUtilization({ poolAddress }: Params, blockchain: Blockchain = EthBlockchain()) {
  switch (blockchain.network) {
  case 'ethereum': {
    const collaterals = await getPoolCollaterals({ poolAddress }, blockchain)
    const utilizationPerCollateral = await Promise.all(collaterals.map(nftId => getCollateralOutstanding({ nftId, poolAddress }, blockchain)))
    const totalUtilization = _.sumBy(utilizationPerCollateral, t => t.amount)

    return $ETH(totalUtilization)
  }
  default:
    throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
