import BigNumber from 'bignumber.js'
import { findOne as findOnePool } from '../db/pools'
import Blockchain from '../entities/lib/Blockchain'
import Pool from '../entities/lib/Pool'
import { $ETH } from '../entities/lib/Value'
import failure from '../utils/failure'
import getPoolCapacity from './getPoolCapacity'
import getPoolUtilization from './getPoolUtilization'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

/**
 * Fetches an existing pool with its usage stats.
 *
 * @param params - See {@link Params}.
 *
 * @returns The pool with its usage stats populated.
 */
export default async function getPool({ blockchain, poolAddress }: Params): Promise<Required<Pool>> {
  const pool = await findOnePool({ address: poolAddress, blockchain })

  if (!pool) throw failure('POOL_NOT_FOUND')

  const [
    { amount: utilizationEth },
    { amount: capacityEth },
  ] = await Promise.all([
    getPoolUtilization({ blockchain, poolAddress }),
    getPoolCapacity({ blockchain, poolAddress }),
  ])

  const valueLockedEth = new BigNumber(capacityEth).plus(new BigNumber(utilizationEth))

  return {
    ...pool,
    utilization: $ETH(utilizationEth),
    valueLocked: $ETH(valueLockedEth),
  }
}
