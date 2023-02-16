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
    polygon: Blockchain.Polygon.Network.MAIN,
  },
}: Params = {}): Promise<GlobalStats> {
  try {
    logger.info(`Fetching global stats for blockchain filter <${JSON.stringify(blockchainFilter)}>...`)

    const blockchain = Blockchain.parseBlockchain(blockchainFilter)
    const [
      ethValueUSD,
      pools,
    ] = await Promise.all([
      getEthValueUSD(blockchain),
      searchPublishedPools({ blockchainFilter, includeRetired: true }),
    ])

    const totalUtilizationETH = pools.reduce((p, c) => p.plus(c.utilization.amount), new BigNumber(0))
    const totalUtilizationUSD = totalUtilizationETH.times(ethValueUSD.amount)
    const totalValueLockedUSD = pools.reduce((p, c) => p.plus(c.valueLocked.amount).plus(c.utilization.amount), new BigNumber(0)).times(ethValueUSD.amount)
    const totalCapacityUSD = totalValueLockedUSD.minus(totalUtilizationUSD)

    const { globalStat, loans } = await getOnChainGlobalStats({ networkId: blockchain?.networkId })
    const totalLentETH = Web3.utils.fromWei(globalStat.historicalLentOut)

    const globalStats: GlobalStats = {
      capacity: Value.$USD(totalCapacityUSD),
      totalValueLentHistorical: Value.$ETH(totalLentETH),
      totalValueLocked: Value.$USD(totalValueLockedUSD.minus(totalUtilizationUSD)),
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
