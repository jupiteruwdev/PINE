import _ from 'lodash'
import Blockchain from '../entities/Blockchain'
import { $ETH } from '../entities/Value'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'
import getLoanEvent from './getLoanEvent'
import getPoolHistoricalCollateralIds from './getPoolHistoricalCollateralIds'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

export default async function getPoolUtilization({ blockchain, poolAddress }: Params) {
  switch (blockchain.network) {
  case 'ethereum': {
    const collaterals = await getPoolHistoricalCollateralIds({ blockchain, poolAddress })
    const web3 = getEthWeb3(blockchain.networkId)

    const utilizationPerCollateral = await Promise.all(collaterals.map(async nftId => {
      const event = await getLoanEvent({ blockchain, nftId, poolAddress })
      const borrowedEth = parseFloat(web3.utils.fromWei(event.borrowedWei))
      const returnedEth = parseFloat(web3.utils.fromWei(event.returnedWei))

      return borrowedEth - returnedEth
    }))

    const totalUtilizationEth = _.sum(utilizationPerCollateral)

    return $ETH(totalUtilizationEth)
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
