import { findAll as findAllPools } from '../db/pools'
import { AnyBlockchain } from '../entities/Blockchain'
import Pool from '../entities/Pool'
import { $ETH } from '../entities/Value'
import getPoolCapacity from './getPoolCapacity'
import getPoolUtilization from './getPoolUtilization'

/**
 * Fetches all existing pools with their usage stats.
 *
 * @param blockchainFilter - Blockchains to filter for the returned pools. If unspecified, all
 *                           blockchains with default network ID will be used. If specified,  only
 *                           blockchains that appear in this dict will be included in the returned
 *                           results.
 *
 * @returns An array of {@link Pool} with usage stats included.
 */
export default async function getPools(blockchainFilter?: { [K in AnyBlockchain]?: string }): Promise<Required<Pool>[]> {
  const pools = await findAllPools({ blockchains: blockchainFilter })

  const poolsWithStats = await Promise.all(pools.map(async pool => {
    const [
      { amount: utilizationEth },
      { amount: capacityEth },
    ] = await Promise.all([
      getPoolUtilization({ poolAddress: pool.address }, pool.blockchain),
      getPoolCapacity({ poolAddress: pool.address }, pool.blockchain),
    ])

    const valueLockedEth = capacityEth + utilizationEth

    return {
      ...pool,
      utilization: $ETH(utilizationEth),
      valueLocked: $ETH(valueLockedEth),
    }
  }))

  return poolsWithStats
}
