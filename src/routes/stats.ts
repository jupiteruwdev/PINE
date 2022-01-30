import { Router } from 'express'
import _ from 'lodash'
import appConf from '../app.conf'
import getCollateralOutstanding from '../core/getCollateralOutstanding'
import getPoolCapacity from '../core/getPoolCapacity'
import getPoolCollaterals from '../core/getPoolCollaterals'
import getPoolLent from '../core/getPoolLent'
import { EthNetwork, getEthBlockNumber, getEthPriceUSD } from '../utils/ethereum'

const router = Router()

router.get('/global', async (req, res) => {
  const networkId = _.toNumber(req.query['network_id'] ?? EthNetwork.MAIN)
  const poolAddresses = appConf.v1pools

  const blockNumber = await getEthBlockNumber()
  const ethPriceUSD = await getEthPriceUSD()
  const capacityPerPool = await Promise.all(poolAddresses.map(poolAddress => getPoolCapacity(poolAddress, { networkId })))
  const lentPerPool = await Promise.all(poolAddresses.map(poolAddress => getPoolLent(poolAddress, { networkId })))
  const collateralsPerPool = await Promise.all(poolAddresses.map(poolAddress => getPoolCollaterals(poolAddress, { networkId })))

  let totalUtilizationEth = 0

  for (let i = 0, n = poolAddresses.length; i < n; i++) {
    const poolAddress = poolAddresses[i]
    const collaterals = collateralsPerPool[i]
    const utilizationPerCollateral = await Promise.all(collaterals.map(nftId => getCollateralOutstanding(nftId, poolAddress, { networkId })))

    totalUtilizationEth += _.sum(utilizationPerCollateral)
  }

  const totalCapacityUSD = _.sum(capacityPerPool) * ethPriceUSD
  const totalLentUSD = _.sum(lentPerPool) * ethPriceUSD
  const totalUtilizationUSD = totalUtilizationEth * ethPriceUSD
  const tvlUSD =  totalUtilizationUSD + totalCapacityUSD

  res.json({
    'usd_capacity': totalCapacityUSD,
    'usd_tvl': tvlUSD,
    'usd_current_utilization': totalUtilizationUSD,
    'utilization_ratio': totalUtilizationUSD / tvlUSD,
    'usd_total_lent_historical': totalLentUSD,
    'block_number': blockNumber,
  })
})

export default router
