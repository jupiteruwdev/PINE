import _ from 'lodash'
import { Blockchain, Pool, Value } from '../../entities'
import searchPublishedPools from './searchPublishedPools'
import getTokenUSDPrice, { AvailableToken } from '../utils/getTokenUSDPrice'

export enum PoolSortType {
  NAME = 'name',
  LTV = 'ltv',
  INTEREST = 'interest',
  UTILIZATION = 'utilization',
  TVL = 'tvl',
}

export enum PoolSortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

type Params = {
  blockchainFilter?: Blockchain.Filter
  collectionAddress?: string
  address?: string
  collectionName?: string
  includeRetired?: boolean
  checkLimit?: boolean
  lenderAddress?: string
  tenors?: number[]
  nftId?: string
  poolVersion?: number
  paginateBy?: {
    count: number
    offset: number
  }
  sortBy?: {
    type: PoolSortType
    direction: PoolSortDirection
  }
}

async function getPublishedPools({
  checkLimit,
  paginateBy,
  ...params
}: Params): Promise<Pool[]> {
  const blockchain = Blockchain.parseBlockchain(params.blockchainFilter ?? {})
  const ethValueUSD = await getTokenUSDPrice(Blockchain.parseNativeToken(blockchain) as AvailableToken)

  const publishedPools = await searchPublishedPools({
    blockchainFilter: params.blockchainFilter,
    collectionAddress: params.collectionAddress,
    tenors: params.tenors,
    sortBy: params.sortBy,
    nftId: params.nftId,
    paginateBy,
    checkLimit,
  })

  const out = publishedPools.map(pool => ({
    ...pool,
    valueLocked: Value.$USD(pool.valueLocked.amount.times(ethValueUSD.amount)),
    utilization: Value.$USD(pool.utilization.amount.times(ethValueUSD.amount)),
  }))

  return out
}

export default getPublishedPools
