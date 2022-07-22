import BigNumber from 'bignumber.js'
import { Blockchain, GlobalStats, Value } from '../../entities'
import logger from '../../utils/logger'
import { getPoolHistoricalLent, getPools } from '../pools'
import { getEthValueUSD } from '../utils/ethereum'

type Params = {
  blockchainFilter?: Blockchain.Filter
}

export default async function getGlobalStats({ blockchainFilter = { ethereum: Blockchain.Ethereum.Network.MAIN, solana: Blockchain.Solana.Network.MAINNET } }: Params = {}): Promise<GlobalStats> {
  try {
    logger.info(`Fetching global stats for blockchain filter <${JSON.stringify(blockchainFilter)}>...`)

    const [
      ethValueUSD,
      pools,
    ] = await Promise.all([
      getEthValueUSD(),
      getPools({ blockchainFilter, includeStats: true }),
    ])

    const totalUtilizationUSD = pools.reduce((p, c) => p.plus(c.utilization.amount), new BigNumber(0)).times(ethValueUSD.amount)
    const totalValueLockedUSD = pools.reduce((p, c) => p.plus(c.valueLocked.amount), new BigNumber(0)).times(ethValueUSD.amount)
    const totalCapacityUSD = totalValueLockedUSD.minus(totalUtilizationUSD)

    const lentEthPerPool = await Promise.all(pools.map(pool => getPoolHistoricalLent({ blockchain: Blockchain.Ethereum(blockchainFilter), poolAddress: pool.address })))
    const totalLentETH = lentEthPerPool.reduce((p, c) => p.plus(c.amount), new BigNumber(0))

    const globalStats: GlobalStats = {
      capacity: Value.$USD(totalCapacityUSD),
      totalValueLentHistorical: Value.$ETH(totalLentETH),
      totalValueLocked: Value.$USD(totalValueLockedUSD),
      utilization: Value.$USD(totalUtilizationUSD),
      utilizationRatio: totalUtilizationUSD.div(totalValueLockedUSD),
    }

    logger.info(`Fetching global stats for blockchain filter <${JSON.stringify(blockchainFilter)}>... OK:`, globalStats)

    return globalStats
  }
  catch (err) {
    logger.error(`Fetching global stats for blockchain filter <${JSON.stringify(blockchainFilter)}>... ERR:`, err)

    throw err
  }
}
