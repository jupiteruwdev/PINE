import BigNumber from 'bignumber.js'
import Web3 from 'web3'
import { Blockchain, GlobalStats, Pool, Value } from '../../entities'
import { getOnChainGlobalStats } from '../../subgraph'
import logger from '../../utils/logger'
import { searchPublishedPools } from '../pools'
import getTokenUSDPrice from '../utils/getTokenUSDPrice'

type Params = {
  blockchainFilter?: Blockchain.Filter
}

export default async function getGlobalStats({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
}: Params = {}): Promise<GlobalStats> {
  try {
    logger.info(`Fetching global stats for blockchain filter <${JSON.stringify(blockchainFilter)}>...`)

    const [
      ethValueUSD,
      pools,
    ] = await Promise.all([
      getTokenUSDPrice(),
      searchPublishedPools({ blockchainFilter, includeRetired: true }),
    ])

    const totalUtilizationETH = pools.reduce((p, c) => p.plus(c.utilization.amount), new BigNumber(0))
    const totalUtilizationUSD = totalUtilizationETH.times(ethValueUSD.amount)
    const totalFundSourceUtilization = new BigNumber(0)
    const fundSourceUtilizations: Record<string, BigNumber> = pools.reduce((p: Record<string, BigNumber>, c: Pool): Record<string, BigNumber> => {
      const fundSource = c?.fundSource || ''
      if (!p[fundSource]) p[fundSource] = c.utilization.amount
      else p[fundSource] = p[fundSource].plus(c.utilization.amount)
      totalFundSourceUtilization.plus(c.utilization.amount)
      return p
    }, {})
    const totalValueLockedUSD = pools.reduce((p, c) => p.plus(c.valueLocked.amount).plus(fundSourceUtilizations[c.fundSource || '']), new BigNumber(0)).times(ethValueUSD.amount)
    const totalCapacityUSD = totalValueLockedUSD.minus(totalUtilizationUSD)

    const { globalStat, loans } = await getOnChainGlobalStats()
    const totalLentETH = Web3.utils.fromWei(globalStat.historicalLentOut)

    const globalStats: GlobalStats = {
      capacity: Value.$USD(totalCapacityUSD),
      totalValueLentHistorical: Value.$ETH(totalLentETH),
      totalValueLocked: Value.$USD(totalValueLockedUSD.minus(totalFundSourceUtilization.times(ethValueUSD.amount))),
      utilization: Value.$ETH(totalUtilizationETH),
      utilizationRatio: totalUtilizationUSD.div(totalValueLockedUSD),
      noOfLoans: loans.length,
    }

    logger.info(`Fetching global stats for blockchain filter <${JSON.stringify(blockchainFilter)}>... OK:`, globalStats)

    return globalStats
  }
  catch (err) {
    logger.error(`Fetching global stats for blockchain filter <${JSON.stringify(blockchainFilter)}>... ERR:`, err)
    throw err
  }
}
