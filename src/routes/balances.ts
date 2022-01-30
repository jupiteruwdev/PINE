import { Router } from 'express'
import _ from 'lodash'
import getCollateralOutstanding from '../core/getCollateralOutstanding'
import getPoolCapacity from '../core/getPoolCapacity'
import getPoolCollaterals from '../core/getPoolCollaterals'
import { EthNetwork, getEthBlockNumber } from '../utils/ethereum'

const router = Router()

router.get('/eth', async (req, res) => {
  const networkId = _.toNumber(req.query.network_id ?? EthNetwork.MAIN)
  const poolAddress = _.toString(req.query.pool_address)

  const nftIds = await getPoolCollaterals(poolAddress, { networkId })
  const utilizationEth = _.sum(await Promise.all(nftIds.map(nftId => getCollateralOutstanding(nftId, poolAddress, { networkId }))))
  const balanceEth = await getPoolCapacity(poolAddress, { networkId })
  const tvlEth = balanceEth + utilizationEth
  const blockNumber = await getEthBlockNumber()

  res.json({
    'eth_tvl': tvlEth,
    'eth_capacity': balanceEth,
    'eth_current_utilization': utilizationEth,
    'utilization_ratio': utilizationEth / tvlEth,
    'block_number': blockNumber,
  })
})

export default router
