import _ from 'lodash'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import Pool from '../entities/Pool'
import { $ETH } from '../entities/Value'
import getCollateralOutstanding from './getCollateralOutstanding'
import getPoolCapacity from './getPoolCapacity'
import getPoolCollaterals from './getPoolCollaterals'

type Params = {
  poolAddress: string
}

export default async function getPool({ poolAddress }: Params, blockchain: Blockchain = EthBlockchain()): Promise<Pool> {
  switch (blockchain.network) {
  case 'ethereum': {
    const [
      lentEthPerCollateral,
      { amount: capacityEth },
    ] = await Promise.all([
      getPoolCollaterals({ poolAddress }, blockchain).then(nftIds => Promise.all(nftIds.map(nftId => getCollateralOutstanding({ nftId, poolAddress }, blockchain)))),
      getPoolCapacity({ poolAddress }, blockchain),
    ])
    const valueLentEth = _.sumBy(lentEthPerCollateral, t => t.amount)
    const valueLockedEth = capacityEth + valueLentEth

    return {
      'address': poolAddress,
      'value_lent': $ETH(valueLentEth),
      'value_locked': $ETH(valueLockedEth),
    }
  }
  default: throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
