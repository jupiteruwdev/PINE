import _ from 'lodash'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import Pool from '../entities/Pool'
import getCollateralOutstanding from './getCollateralOutstanding'
import getPoolCapacity from './getPoolCapacity'
import getPoolCollaterals from './getPoolCollaterals'

export default async function getPool(poolAddress: string, blockchain: Blockchain = EthBlockchain()): Promise<Pool> {
  switch (blockchain.network) {
    case 'ethereum': {
      const nftIds = await getPoolCollaterals(poolAddress, blockchain)
      const capacityEth = await getPoolCapacity(poolAddress, blockchain)
      const valueLentEth = _.sum(await Promise.all(nftIds.map(nftId => getCollateralOutstanding(nftId, poolAddress, blockchain))))
      const valueLockedEth = capacityEth + valueLentEth

      return {
        'address': poolAddress,
        'currency': {
          blockchain,
          'name': 'ether',
        },
        'value_lent': valueLentEth,
        'value_locked': valueLockedEth,
      }
    }
    default: throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
