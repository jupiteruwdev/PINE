import BigNumber from 'bignumber.js'
import { findAllPools } from '../../db'
import { Blockchain, Pool, Value } from '../../entities'
import { SortDirection, SortType } from '../../utils/sort'
import getPoolCapacity from './getPoolCapacity'
import getPoolUtilization from './getPoolUtilization'

type Params = {
  blockchainFilter?: Blockchain.Filter
  collectionAddress?: string
  lenderAddress?: string
  offset?: number
  count?: number
  collectionName?: string
  sortBy?: SortType
  sortDirection?: SortDirection
}

/**
 * Fetches all existing pools with their usage stats.
 *
 * @param params - See {@link Params}.
 *
 * @returns An array of {@link Pool} with usage stats included.
 */
export default async function getPools({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
  collectionAddress,
  lenderAddress,
  offset,
  count,
  collectionName,
  sortBy,
  sortDirection,
}: Params): Promise<Required<Pool>[]> {
  const pools = await findAllPools({
    blockchainFilter,
    collectionAddress,
    lenderAddress,
    offset,
    count,
    collectionName,
    sortBy,
    sortDirection,
  })

  const poolsWithStats = await Promise.all(
    pools.map(async pool => {
      const [{ amount: utilizationEth }, { amount: capacityEth }] =
        await Promise.all([
          getPoolUtilization({
            blockchain: pool.blockchain,
            poolAddress: pool.address,
          }),
          getPoolCapacity({
            blockchain: pool.blockchain,
            poolAddress: pool.address,
          }),
        ])

      const valueLockedEth = capacityEth.plus(utilizationEth).gt(new BigNumber(pool.ethLimit || Number.POSITIVE_INFINITY)) ? new BigNumber(pool.ethLimit ?? 0) : capacityEth.plus(utilizationEth)

      return {
        ...pool,
        utilization: Value.$ETH(utilizationEth),
        valueLocked: Value.$ETH(valueLockedEth),
      }
    })
  )

  return poolsWithStats
}
