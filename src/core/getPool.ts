import { findOne as findOnePool } from '../db/pools'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import Pool from '../entities/Pool'
import { $ETH } from '../entities/Value'
import failure from '../utils/failure'
import getPoolCapacity from './getPoolCapacity'
import getPoolUtilization from './getPoolUtilization'

type Params = {
  poolAddress: string
}

/**
 * Fetches an existing pool with its usage stats.
 *
 * @param param - See {@link Params}.
 * @param blockchain - The blockchain of which the pool resides.
 *
 * @returns The pool with its usage stats populated.
 */
export default async function getPool({ poolAddress }: Params, blockchain: Blockchain = EthBlockchain()): Promise<Required<Pool>> {
  const pool = await findOnePool({ address: poolAddress, blockchain })

  if (!pool) throw failure('POOL_NOT_FOUND')

  const [
    { amount: utilizationEth },
    { amount: capacityEth },
  ] = await Promise.all([
    getPoolUtilization({ poolAddress }, blockchain),
    getPoolCapacity({ poolAddress }, blockchain),
  ])

  const valueLockedEth = capacityEth + utilizationEth

  return {
    ...pool,
    utilization: $ETH(utilizationEth),
    valueLocked: $ETH(valueLockedEth),
  }
}
