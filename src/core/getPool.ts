import _ from 'lodash'
import Blockchain from '../entities/Blockchain'
import Pool from '../entities/Pool'
import { EthNetwork, Web3Options } from '../utils/ethereum'
import getCollateralOutstanding from './getCollateralOutstanding'
import getPoolCapacity from './getPoolCapacity'
import getPoolCollaterals from './getPoolCollaterals'

export default async function getPool(poolAddress: string, options: Web3Options = {}): Promise<Pool> {
  const nftIds = await getPoolCollaterals(poolAddress, options)
  const capacity = await getPoolCapacity(poolAddress, options)
  const valueLent = _.sum(await Promise.all(nftIds.map(nftId => getCollateralOutstanding(nftId, poolAddress, options))))
  const valueLocked = capacity + valueLent

  const blockchain: Blockchain = {
    'network': 'ethereum',
    'network_id': (options.networkId ?? EthNetwork.MAIN).toString(),
  }

  return {
    'address': poolAddress,
    'currency': {
      blockchain,
      'name': 'ether',
    },
    'value_lent': valueLent,
    'value_locked': valueLocked,
  }
}
