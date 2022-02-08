import { RequestHandler } from 'express'
import _ from 'lodash'
import appConf from '../../app.conf'
import getCollateralOutstanding from '../../core/getCollateralOutstanding'
import getPoolCapacity from '../../core/getPoolCapacity'
import getPoolCollaterals from '../../core/getPoolCollaterals'
import getPoolLent from '../../core/getPoolLent'
import { EthBlockchain } from '../../entities/Blockchain'
import GlobalStats from '../../entities/GlobalStats'
import { EthNetwork, getEthBlockNumber, getEthPriceUSD } from '../../utils/ethereum'
import logger from '../../utils/logger'

export default function getGlobalStats(): RequestHandler {
  return async (req, res) => {
    const networkId = _.toNumber(req.query['network_id'] ?? EthNetwork.MAIN)
    const poolAddresses = appConf.v1Pools

    logger.info('Fetching global stats...')

    const blockNumber = await getEthBlockNumber()
    const ethPriceUSD = await getEthPriceUSD()
    const ethBlockchain = EthBlockchain(networkId)
    const capacityPerPool = await Promise.all(poolAddresses.map(poolAddress => getPoolCapacity(poolAddress, ethBlockchain)))
    const lentPerPool = await Promise.all(poolAddresses.map(poolAddress => getPoolLent(poolAddress, ethBlockchain)))
    const collateralsPerPool = await Promise.all(poolAddresses.map(poolAddress => getPoolCollaterals(poolAddress, ethBlockchain)))

    let totalUtilizationEth = 0

    for (let i = 0, n = poolAddresses.length; i < n; i++) {
      const poolAddress = poolAddresses[i]
      const collaterals = collateralsPerPool[i]
      const utilizationPerCollateral = await Promise.all(collaterals.map(nftId => getCollateralOutstanding(nftId, poolAddress, ethBlockchain)))

      totalUtilizationEth += _.sum(utilizationPerCollateral)
    }

    const totalCapacityUSD = _.sum(capacityPerPool) * ethPriceUSD
    const totalLentUSD = _.sum(lentPerPool) * ethPriceUSD
    const totalUtilizationUSD = totalUtilizationEth * ethPriceUSD
    const tvlUSD =  totalUtilizationUSD + totalCapacityUSD

    logger.info('Fetching global stats... OK')

    const payload: GlobalStats = {
      'block_number': blockNumber,
      'capacity_usd': totalCapacityUSD,
      'total_lent_historical_usd': totalLentUSD,
      'total_value_locked_usd': tvlUSD,
      'utilization_usd': totalUtilizationUSD,
      'utilization_ratio': totalUtilizationUSD / tvlUSD,
    }

    res.status(200).json(payload)
  }
}
