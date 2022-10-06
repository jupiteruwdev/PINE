import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Collection, Fee, LoanOption, Pool, Value } from '../../entities'
import { getOnChainPools } from '../../subgraph'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getEthCollectionMetadata } from '../collections'
import getOnChainLoanOptions from './getOnChainLoanOptions'
import getPoolCapacity from './getPoolCapacity'
import getPoolUtilization from './getPoolUtilization'
import searchPublishedPools from './searchPublishedPools'

type Params = {
  blockchainFilter?: Blockchain.Filter
  lenderAddress?: string
  address?: string
  collectionAddress?: string
  includeStats?: boolean
}

type MapPoolParams = {
  blockchain: Blockchain
  pools: any[]
  loanOptionsDict: any
  includeStats: boolean
}

async function mapPool({ blockchain, pools, loanOptionsDict, includeStats }: MapPoolParams): Promise<Pool[]> {
  const uniqPools = _.uniqWith(pools, (a, b) => (a.id === b.id && a.collection === b.toLowerCase))

  const poolsData = await Promise.all(_.map(uniqPools, (async pool => {
    const collectionMetadata = await getEthCollectionMetadata({ blockchain, matchSubcollectionBy: { type: 'poolAddress', value: pool.id }, collectionAddress: pool.collection })
    const stats: any = {}
    if (includeStats) {
      const [
        { amount: utilizationEth },
        { amount: capacityEth },
      ] = await Promise.all([
        getPoolUtilization({ blockchain, poolAddress: pool.id }),
        getPoolCapacity({ blockchain, poolAddress: pool.id, tokenAddress: pool.supportedCurrency, fundSource: pool.fundSource }),
      ])
      const valueLockedEth = capacityEth.plus(utilizationEth).gt(new BigNumber(pool.ethLimit || Number.POSITIVE_INFINITY)) ? new BigNumber(pool.ethLimit ?? 0) : capacityEth.plus(utilizationEth)
      stats.utilization = Value.$ETH(utilizationEth)
      stats.valueLocked = Value.$ETH(valueLockedEth)
    }

    return Pool.factory({
      version: 2,
      collection: Collection.factory({
        address: pool.collection,
        blockchain,
        ...collectionMetadata,
      }),
      address: pool.id,
      tokenAddress: pool.supportedCurrency,
      fundSource: pool.fundSource,
      blockchain,
      loanOptions: loanOptionsDict[pool.id.toLowerCase()]?.map((lo: any) => LoanOption.factory({
        interestBPSPerBlock: lo.interestBpsBlock,
        loanDurationBlocks: lo.loanDurationSecond / appConf.blocksPerSecond,
        loanDurationSeconds: lo.loanDurationSecond,
        maxLTVBPS: lo.maxLtvBps,
        fees: appConf.defaultFees.map(fee => Fee.factory(fee)),
      })) || [],
      lenderAddress: pool.lenderAddress ?? '',
      routerAddress: _.get(appConf.routerAddress, blockchain.networkId),
      repayRouterAddress: _.get(appConf.repayRouterAddress, blockchain.networkId),
      rolloverAddress: _.get(appConf.rolloverAddress, blockchain.networkId),
      ethLimit: 0,
      published: false,
      ...stats,
    })
  })))

  return poolsData
}

export default async function getPools({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
  lenderAddress,
  address,
  collectionAddress,
  includeStats = false,
}: Params): Promise<Pool[]> {
  logger.info(`Fetching unpublished pools by lender address <${lenderAddress}>, collection address <${collectionAddress}> and address <${address}> on blockchain ${JSON.stringify(blockchainFilter)}`)
  let poolsData: Pool[] = []

  if (blockchainFilter.ethereum !== undefined) {
    const blockchain = Blockchain.Ethereum(blockchainFilter.ethereum)
    const publishedPools = await searchPublishedPools({
      blockchainFilter,
      lenderAddress,
      address,
      collectionAddress,
      includeStats,
    })
    const excludeAddresses = publishedPools.map(pool => pool.address.toLowerCase())

    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
      const { pools: poolsMainnet } = await getOnChainPools({ lenderAddress, address, excludeAddresses, collectionAddress }, { networkId: blockchain.networkId })

      const loanOptionsDict = await getOnChainLoanOptions({ addresses: poolsMainnet.map((p: any) => p.id), networkId: blockchain.networkId })

      poolsData = [
        ...publishedPools,
        ...await mapPool({ blockchain, pools: poolsMainnet, loanOptionsDict, includeStats }),
      ]
      break
    case Blockchain.Ethereum.Network.RINKEBY:
      const { pools: poolsRinkeby } = await getOnChainPools({ lenderAddress, address, excludeAddresses, collectionAddress }, { networkId: blockchain.networkId })
      poolsData = [
        ...publishedPools,
        ...await mapPool({ blockchain, pools: poolsRinkeby, loanOptionsDict: {}, includeStats }),
      ]
    }
  }
  else {
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }

  return poolsData
}
