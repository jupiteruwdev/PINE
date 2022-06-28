import BigNumber from 'bignumber.js'
import { ETHLimits } from '../config/supportedCollections'
import { findAllPools } from '../db'
import { Blockchain, Pool, Value } from '../entities'
import getPoolCapacity from './getPoolCapacity'
import getPoolUtilization from './getPoolUtilization'

type Params = {
  blockchainFilter?: Blockchain.Filter
  collectionAddress?: string
  offset?: number
  count?: number
  collectionName?: string
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
  offset,
  count,
  collectionName,
}: Params): Promise<Required<Pool>[]> {
  const pools = await findAllPools({
    blockchainFilter,
    collectionAddress,
    offset,
    count,
    collectionName,
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

      const valueLockedEth = capacityEth.plus(utilizationEth).gt(new BigNumber(ETHLimits[pool.address])) ? new BigNumber(ETHLimits[pool.address]) : capacityEth.plus(utilizationEth)

      return {
        ...pool,
        utilization: Value.$ETH(utilizationEth),
        valueLocked: Value.$ETH(valueLockedEth),
      }
    })
  )

  return poolsWithStats
}
