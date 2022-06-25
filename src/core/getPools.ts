import BigNumber from 'bignumber.js'
import { ETHLimits } from '../config/supportedCollections'
import { findAll as findAllPools } from '../db/pools'
import { $ETH, BlockchainFilter, EthereumNetwork, Pool, SolanaNetwork } from '../entities'
import getPoolCapacity from './getPoolCapacity'
import getPoolUtilization from './getPoolUtilization'

type Params = {
  blockchainFilter?: BlockchainFilter
  collectionAddress?: string
  offset?: number
  count?: number
}

/**
 * Fetches all existing pools with their usage stats.
 *
 * @param params - See {@link Params}.
 *
 * @returns An array of {@link Pool} with usage stats included.
 */
export default async function getPools({ blockchainFilter = { ethereum: EthereumNetwork.MAIN, solana: SolanaNetwork.MAINNET }, collectionAddress, offset, count }: Params): Promise<Required<Pool>[]> {
  const pools = await findAllPools({ blockchainFilter, collectionAddress, offset, count })

  const poolsWithStats = await Promise.all(pools.map(async pool => {
    const [
      { amount: utilizationEth },
      { amount: capacityEth },
    ] = await Promise.all([
      getPoolUtilization({ blockchain: pool.blockchain, poolAddress: pool.address }),
      getPoolCapacity({ blockchain: pool.blockchain, poolAddress: pool.address }),
    ])

    const valueLockedEth = capacityEth.plus(utilizationEth).gt(new BigNumber(ETHLimits[pool.address])) ? new BigNumber(ETHLimits[pool.address]) : capacityEth.plus(utilizationEth)

    return {
      ...pool,
      utilization: $ETH(utilizationEth),
      valueLocked: $ETH(valueLockedEth),
    }
  }))

  return poolsWithStats
}
