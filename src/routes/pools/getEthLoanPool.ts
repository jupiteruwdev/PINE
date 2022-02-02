import { RequestHandler } from 'express'
import _ from 'lodash'
import getCollateralOutstanding from '../../core/getCollateralOutstanding'
import getPoolCapacity from '../../core/getPoolCapacity'
import getPoolCollaterals from '../../core/getPoolCollaterals'
import LoanPool from '../../entities/LoanPool'
import { EthNetwork, getEthBlockNumber } from '../../utils/ethereum'

export default function getEthLoanPool(): RequestHandler {
  return async (req, res) => {
    const networkId = _.toNumber(req.query.network_id ?? EthNetwork.MAIN)
    const poolAddress = req.params.address

    const nftIds = await getPoolCollaterals(poolAddress, { networkId })
    const utilizationEth = _.sum(await Promise.all(nftIds.map(nftId => getCollateralOutstanding(nftId, poolAddress, { networkId }))))
    const balanceEth = await getPoolCapacity(poolAddress, { networkId })
    const tvlEth = balanceEth + utilizationEth
    const blockNumber = await getEthBlockNumber()

    const payload: LoanPool = {
      'eth_tvl': tvlEth,
      'eth_capacity': balanceEth,
      'eth_current_utilization': utilizationEth,
      'utilization_ratio': utilizationEth / tvlEth,
      'block_number': blockNumber,
    }

    res.status(200).json(payload)
  }
}
