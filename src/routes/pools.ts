import { Router } from 'express'
import getPool from '../core/getPool'
import getPoolGroupStats from '../core/getPoolGroupStats'
import getPools from '../core/getPools'
import { countAllPools } from '../db'
import { Pagination, Pool, PoolGroupStats, serializeEntityArray } from '../entities'
import failure from '../utils/failure'
import { getBlockchain, getBlockchainFilter, getNumber, getString } from '../utils/query'
import tryOrUndefined from '../utils/tryOrUndefined'

const router = Router()

router.get('/', async (req, res, next) => {
  const blockchainFilter = getBlockchainFilter(req.query, true)
  const collectionAddress = tryOrUndefined(() => getString(req.query, 'collectionAddress'))
  const offset = tryOrUndefined(() => getNumber(req.query, 'offset'))
  const count = tryOrUndefined(() => getNumber(req.query, 'count'))
  const collectionName = tryOrUndefined(() => getString(req.query, 'search'))
  const totalCount = await countAllPools({ collectionAddress, blockchainFilter, collectionName })

  if (collectionAddress) {
    const pools = await getPools({
      blockchainFilter,
      collectionAddress,
      offset,
      count,
    })
    const payload = serializeEntityArray(pools, Pool.codingResolver)
    const nextOffset = (offset ?? 0) + pools.length
    const pagination = Pagination.serialize({ data: payload, totalCount, nextOffset: nextOffset === totalCount - 1 ? undefined : nextOffset })
    res.status(200).json(pagination)
  }
  else {
    try {
      const pools = await getPoolGroupStats({ blockchainFilter, count, offset, collectionName })
      const payload = serializeEntityArray(pools, PoolGroupStats.codingResolver)
      const nextOffset = (offset ?? 0) + pools.length
      const pagination = Pagination.serialize({ data: payload, totalCount, nextOffset: nextOffset === totalCount - 1 ? undefined : nextOffset })
      res.status(200).json(pagination)
    }
    catch (err) {
      next(failure('FETCH_POOL_GROUP_STATS_FAILURE', err))
    }
  }
})

router.get('/eth/:address', async (req, res, next) => {
  const blockchain = getBlockchain(req.query)
  const poolAddress = req.params.address

  try {
    const pool = await getPool({ blockchain, poolAddress })
    const payload = Pool.serialize(pool)
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_POOL_FAILURE', err))
  }
})

export default router
