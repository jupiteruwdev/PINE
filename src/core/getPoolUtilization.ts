import BigNumber from 'bignumber.js'
import Blockchain from '../entities/lib/Blockchain'
import Value, { $ETH } from '../entities/lib/Value'
import { getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'
import getLoanEvent from './getLoanEvent'
import getPoolHistoricalCollateralIds from './getPoolHistoricalCollateralIds'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

export default async function getPoolUtilization({ blockchain, poolAddress }: Params): Promise<Value> {
  switch (blockchain.network) {
  case 'ethereum': {
    const collaterals = await getPoolHistoricalCollateralIds({ blockchain, poolAddress })
    const web3 = getEthWeb3(blockchain.networkId)

    const utilizationWeiPerCollateral = await Promise.all(collaterals.map(async nftId => {
      const event = await getLoanEvent({ blockchain, nftId, poolAddress })
      const borrowedWei = new BigNumber(event.borrowedWei)
      const returnedWei = new BigNumber(event.returnedWei)

      return borrowedWei.minus(returnedWei)
    }))

    const totalUtilizationWei = utilizationWeiPerCollateral.reduce((p, c) => p.plus(c), new BigNumber(0))
    const totalUtilizationEth = web3.utils.fromWei(totalUtilizationWei.toFixed())

    return $ETH(totalUtilizationEth)
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
