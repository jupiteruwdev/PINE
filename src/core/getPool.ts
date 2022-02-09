import _ from 'lodash'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import { $ETH } from '../entities/Currency'
import Pool from '../entities/Pool'
import getCollateralOutstanding from './getCollateralOutstanding'
import getPoolCapacity from './getPoolCapacity'
import getPoolCollaterals from './getPoolCollaterals'

type Params = {
  poolAddress: string
}

export default async function getPool({ poolAddress }: Params, blockchain: Blockchain = EthBlockchain()): Promise<Pool> {
  switch (blockchain.network) {
  case 'ethereum': {
    const nftIds = await getPoolCollaterals({ poolAddress }, blockchain)
    const { value: capacityEth } = await getPoolCapacity({ poolAddress }, blockchain)
    const valueLentEth = _.sumBy(await Promise.all(nftIds.map(nftId => getCollateralOutstanding({ nftId, poolAddress }, blockchain))), 'value')
    const valueLockedEth = capacityEth + valueLentEth

    return {
      'address': poolAddress,
      'currency': $ETH(blockchain.network_id),
      'value_lent': valueLentEth,
      'value_locked': valueLockedEth,
    }
  }
  default: throw Error(`Unsupported blockchain <${blockchain.network}>`)
  }
}
