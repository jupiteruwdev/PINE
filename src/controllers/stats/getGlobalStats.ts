import BigNumber from 'bignumber.js'
import Web3 from 'web3'
import { Blockchain, GlobalStats, Value } from '../../entities'
import { getOnChainGlobalStats } from '../../subgraph'
import logger from '../../utils/logger'
import { searchPublishedPools } from '../pools'
import getEthValueUSD from '../utils/getEthValueUSD'

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
      getEthValueUSD(),
      searchPublishedPools({ blockchainFilter, includeRetired: true }),
    ])

    const totalUtilizationUSD = pools.reduce((p, c) => p.plus(c.utilization.amount), new BigNumber(0)).times(ethValueUSD.amount)
    const totalValueLockedUSD = pools.reduce((p, c) => p.plus(c.valueLocked.amount).plus(c.utilization.amount), new BigNumber(0)).times(ethValueUSD.amount)
    const totalCapacityUSD = totalValueLockedUSD.minus(totalUtilizationUSD)

    const { globalStat, loans } = await getOnChainGlobalStats()
    const totalLentETH = Web3.utils.fromWei(globalStat.historicalLentOut)

    const globalStats: GlobalStats = {
      capacity: Value.$USD(totalCapacityUSD),
      totalValueLentHistorical: Value.$ETH(totalLentETH),
      totalValueLocked: Value.$USD(totalValueLockedUSD.minus(totalUtilizationUSD)),
      utilization: Value.$USD(totalUtilizationUSD),
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
