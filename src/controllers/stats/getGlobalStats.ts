import BigNumber from 'bignumber.js'
import { ethers } from 'ethers'
import _ from 'lodash'
import Web3 from 'web3'
import appConf from '../../app.conf'
import { Blockchain, GlobalStats, Pool, Value } from '../../entities'
import { getOnChainGlobalStats, getOnChainPools } from '../../subgraph'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getTokenContract } from '../contracts'
import { searchPublishedPools } from '../pools'
import searchPublishedMultiplePools from '../pools/searchPublishedMultiplePools'
import getTokenUSDPrice, { AvailableToken } from '../utils/getTokenUSDPrice'

type Params = {
  blockchainFilter?: Blockchain.Filter
}

export default async function getGlobalStats({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
    polygon: Blockchain.Polygon.Network.MAIN,
    arbitrum: Blockchain.Arbitrum.Network.MAINNET,
    avalanche: Blockchain.Avalanche.Network.MAINNET,
  },
}: Params = {}): Promise<GlobalStats> {
  try {
    logger.info(`Fetching global stats for blockchain filter <${JSON.stringify(blockchainFilter)}>...`)

    const blockchains = Blockchain.fromFilter(blockchainFilter)
    const evmBlockchains = blockchains.filter(blockchain => blockchain.network !== 'solana')
    let globalStats: GlobalStats = GlobalStats.factory({
      capacity: Value.$USD(0),
      totalValueLentHistorical: Value.$USD(0),
      totalValueLocked: Value.$USD(0),
      utilization: Value.$USD(0),
      utilizationRatio: 0,
      noOfLoans: 0,
      tvlNft: Value.$USD(0),
      tal: Value.$USD(0),
    })
    let totalUtilizationUSDSum = new BigNumber(0)
    let totalValueLockedUSDSum = new BigNumber(0)

    for (const blockchain of evmBlockchains) {
      const filter = Blockchain.parseFilter(blockchain)
      const [
        ethValueUSD,
        pools,
        { pools: allPools },
      ] = await Promise.all([
        getTokenUSDPrice(Blockchain.parseNativeToken(blockchain) as AvailableToken),
        searchPublishedPools({ blockchainFilter: filter, includeRetired: true }),
        getOnChainPools({}, { networkId: blockchain.networkId }),
      ])

      const wethContract = getTokenContract({ blockchain, address: _.get(appConf.wethAddress, blockchain.networkId) })

      const uniqFundSources = _.uniqBy(allPools, 'lenderAddress').map(pool => _.get(pool, 'lenderAddress')).filter(pool => !!pool)

      const wethPermissions = await Promise.all(uniqFundSources.map(fundSource => wethContract.methods.balanceOf(fundSource).call()))
      const wethPermissioned = wethPermissions.reduce((pre, cur) => pre.plus(new BigNumber(ethers.utils.formatEther(cur) ?? '0')), new BigNumber(0))

      const totalUtilizationUSD = pools.reduce((p, c) => p.plus(c.utilization.amount), new BigNumber(0))
      const totalFundSourceUtilization = new BigNumber(0)
      const fundSourceUtilizations: Record<string, BigNumber> = pools.reduce((p: Record<string, BigNumber>, c: Pool): Record<string, BigNumber> => {
        const fundSource = c?.fundSource || ''
        if (!p[fundSource]) p[fundSource] = c.utilization.amount
        else p[fundSource] = p[fundSource].plus(c.utilization.amount)
        totalFundSourceUtilization.plus(c.utilization.amount)
        return p
      }, {})
      const totalValueLockedUSD = pools.reduce((p, c) => p.plus(c.valueLocked.amount).plus(fundSourceUtilizations[c.fundSource || '']), new BigNumber(0))
      const totalCapacityUSD = totalValueLockedUSD.minus(totalUtilizationUSD)

      const { globalStat, loans } = await getOnChainGlobalStats({ networkId: blockchain?.networkId })
      const poolAddresses = loans.map((loan: any) => loan.pool)
      const collectionAddresses = loans.map((loan: any) => loan.erc721)
      const nftIds = loans.map((loan: any) => loan.id.split('/')[1])
      const poolsUtilized = await searchPublishedMultiplePools({ addresses: poolAddresses, nftIds, collectionAddresses, includeRetired: true, blockchainFilter })
      const poolsUtilizedTransformed = poolsUtilized.reduce((r, p) => {
        r[p.address] = {
          addr: p.address,
          val: p.collection.valuation?.value?.amount.toString(),
          col: p.collection.name,
        }
        return r
      }
      , {} as Record<string, any>)

      const tvlNFTETH = loans.map((loan: any) => ({
        pa: loan.pool,
        ca: loan.erc721,
        id: loan.id.split('/')[1],
        valuation: poolsUtilizedTransformed[loan.pool]?.val,
      })).reduce((p: any, r: any) => p + (Number(r.valuation || 0) || 0), 0)

      const totalLentETH = Web3.utils.fromWei(_.get(globalStat, 'historicalLentOut', '0'))
      totalUtilizationUSDSum = totalUtilizationUSDSum.plus(totalUtilizationUSD)
      totalValueLockedUSDSum = totalValueLockedUSDSum.plus(totalValueLockedUSD)

      globalStats = GlobalStats.factory({
        capacity: Value.$USD(totalCapacityUSD.plus(globalStats.capacity.amount)),
        totalValueLentHistorical: Value.$USD(globalStats.totalValueLentHistorical.amount.plus(new BigNumber(totalLentETH).times(ethValueUSD.amount))),
        totalValueLocked: Value.$USD(globalStats.totalValueLocked.amount.plus(totalValueLockedUSD.minus(totalFundSourceUtilization))),
        utilization: Value.$USD(globalStats.utilization.amount.plus(totalUtilizationUSD)),
        utilizationRatio: totalUtilizationUSDSum.div(totalValueLockedUSDSum),
        noOfLoans: globalStats.noOfLoans + loans.length,
        tvlNft: Value.$USD(globalStats.tvlNft.amount.plus(new BigNumber(tvlNFTETH).times(ethValueUSD.amount).plus(totalUtilizationUSD))),
        tal: Value.$USD(globalStats.tal.amount.plus(wethPermissioned.times(ethValueUSD.amount))),
      })

      logger.info(`Fetching global stats for blockchain filter <${JSON.stringify(blockchainFilter)}>... OK:`, globalStats)
    }

    return globalStats
  }
  catch (err) {
    logger.error(`Fetching global stats for blockchain filter <${JSON.stringify(blockchainFilter)}>... ERR:`, err)
    throw fault('ERR_GET_GLOBAL_STATS', undefined, err)
  }
}
