import { ethers } from 'ethers'
import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Collection, Fee, LoanOption, Pool, Value } from '../../entities'
import { getOnChainPools } from '../../subgraph'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getEthCollectionMetadata } from '../collections'
import getPoolEthLimit from '../contracts/getPoolEthLimit'
import getOnChainLoanOptions from './getOnChainLoanOptions'
import getPoolCapacity from './getPoolCapacity'
import getPoolUtilization from './getPoolUtilization'
import searchPublishedPools from './searchPublishedPools'

type Params = {
  blockchainFilter?: Blockchain.Filter
  lenderAddress?: string
  address?: string
  collectionAddress?: string
}

type MapPoolParams = {
  blockchain: Blockchain
  pools: any[]
  loanOptionsDict: any
}

async function mapPool({ blockchain, pools, loanOptionsDict }: MapPoolParams): Promise<Pool[]> {
  try {
    const uniqPools = _.uniqWith(pools, (a, b) => (a.id === b.id && a.collection === b.toLowerCase))

    const poolsData = await Promise.all(_.map(uniqPools, (async pool => {
      const collectionMetadata = await getEthCollectionMetadata({ blockchain, collectionAddress: pool.collection })
      const stats: any = {}
      const [
        { amount: utilizationEth },
        { amount: capacityEth },
        maxLoanLimit,
      ] = await Promise.all([
        getPoolUtilization({ blockchain, poolAddress: pool.id }),
        getPoolCapacity({ blockchain, poolAddress: pool.id, tokenAddress: pool.supportedCurrency, fundSource: pool.fundSource }),
        getPoolEthLimit({ blockchain, poolAddress: pool.id }),
      ])
      const ethLimit = _.toNumber(ethers.utils.formatEther(maxLoanLimit ?? pool.maxLoanLimit ?? '0'))
      const valueLockedEth = capacityEth.plus(utilizationEth)
      stats.utilization = Value.$ETH(utilizationEth)
      stats.valueLocked = Value.$ETH(valueLockedEth)

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
        ethLimit,
        published: false,
        ...stats,
      })
    })))

    return poolsData
  }
  catch (err) {
    throw fault('ERR_GET_POOLS_MAP_POOL', undefined, err)
  }
}

export default async function getPools({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
    polygon: Blockchain.Polygon.Network.MAIN,
    arbitrum: Blockchain.Arbitrum.Network.MAINNET,
    avalanche: Blockchain.Avalanche.Network.MAINNET,
  },
  lenderAddress,
  address,
  collectionAddress,
}: Params): Promise<Pool[]> {
  try {
    logger.info(`Fetching unpublished pools by lender address <${lenderAddress}>, collection address <${collectionAddress}> and address <${address}> on blockchain ${JSON.stringify(blockchainFilter)}`)
    let poolsData: Pool[] = []

    const blockchain = Blockchain.parseBlockchain(blockchainFilter)

    if (!Blockchain.isEVMChain(blockchain)) throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    const publishedPools = await searchPublishedPools({
      blockchainFilter,
      lenderAddress,
      address,
      collectionAddress,
      minorPools: true,
      convertToUSD: false,
    })

    const excludeAddresses = publishedPools.map(pool => pool.address.toLowerCase())

    switch (blockchain.networkId) {
    case Blockchain.Ethereum.Network.MAIN:
    case Blockchain.Polygon.Network.MAIN:
    case Blockchain.Arbitrum.Network.MAINNET:
    case Blockchain.Avalanche.Network.MAINNET:
      const { pools: poolsMainnet } = await getOnChainPools({ lenderAddress, address, excludeAddresses, collectionAddress }, { networkId: blockchain.networkId })

      const loanOptionsDict = await getOnChainLoanOptions({ addresses: poolsMainnet.map((p: any) => p.id), networkId: blockchain.networkId })

      poolsData = [
        ...publishedPools,
        ...await mapPool({ blockchain, pools: poolsMainnet, loanOptionsDict }),
      ]
      break
    case Blockchain.Ethereum.Network.GOERLI:
    case Blockchain.Polygon.Network.MUMBAI:
      const { pools: poolsRinkeby } = await getOnChainPools({ lenderAddress, address, excludeAddresses, collectionAddress }, { networkId: blockchain.networkId })
      poolsData = [
        ...publishedPools,
        ...await mapPool({ blockchain, pools: poolsRinkeby, loanOptionsDict: {} }),
      ]
    }

    return poolsData
  }
  catch (err) {
    throw fault('ERR_GET_POOLS', undefined, err)
  }
}
