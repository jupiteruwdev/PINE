import { findAll as findAllPools } from '../db/pools'
import { AnyBlockchain } from '../entities/Blockchain'
import Pool from '../entities/Pool'
import { $ETH } from '../entities/Value'
import getPoolCapacity from './getPoolCapacity'
import getPoolUtilization from './getPoolUtilization'

type Params = {
  /**
   * Blockchains to filter for the returned pools. If specified, only pools residing in the
   * mapped blockchains will be returned. Otherwise if unspecified (i.e. `filter.blockchains` ===
   * `undefined`), all pools of all blockchains in their default network IDs will be returned.
   */
  blockchains?: { [K in AnyBlockchain]?: string }
}

/**
 * Fetches all existing pools with their usage stats.
 *
 * @param params - See {@link Params}.
 *
 * @returns An array of {@link Pool} with usage stats included.
 */
export default async function getPools({ blockchains }: Params): Promise<Required<Pool>[]> {
  const pools = await findAllPools({ blockchains })

  const poolsWithStats = await Promise.all(pools.map(async pool => {
    const [
      { amount: utilizationEth },
      { amount: capacityEth },
    ] = await Promise.all([
      getPoolUtilization({ blockchain: pool.blockchain, poolAddress: pool.address }),
      getPoolCapacity({ blockchain: pool.blockchain, poolAddress: pool.address }),
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