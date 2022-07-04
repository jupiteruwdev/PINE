import BigNumber from 'bignumber.js'
import { ETHLimits } from '../config/supportedCollections'
import { findOnePool } from '../db'
import { Blockchain, Pool, Value } from '../entities'
import fault from '../utils/fault'
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
  if (!pool) throw fault('ERR_POOL_NOT_FOUND')

  const [
    { amount: utilizationEth },
    { amount: capacityEth },
  ] = await Promise.all([
    getPoolUtilization({ blockchain, poolAddress }),
    getPoolCapacity({ blockchain, poolAddress }),
  ])

  const valueLockedEth = capacityEth.plus(utilizationEth).gt(new BigNumber(ETHLimits[poolAddress])) ? new BigNumber(ETHLimits[poolAddress]) : capacityEth.plus(utilizationEth)

  return {
    ...pool,
    utilization: Value.$ETH(utilizationEth),
    valueLocked: Value.$ETH(valueLockedEth),
  }
}
