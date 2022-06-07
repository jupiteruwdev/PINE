import { Router } from 'express'
import getAggregatedPools from '../core/getAggregatedPools'
import getPool from '../core/getPool'
import getPools from '../core/getPools'
import { findAll as findAllCollections } from '../db/collections'
import { serializeAggregatedPools } from '../entities/lib/AggregatedPool'
import { serializePagination } from '../entities/lib/Pagination'
import { serializePool, serializePools } from '../entities/lib/Pool'
import failure from '../utils/failure'
import { getBlockchain, getBlockchainFilter, getNumber, getString } from '../utils/query'
import tryOrUndefined from '../utils/tryOrUndefined'

const router = Router()

router.get('/', async (req, res, next) => {
  const blockchainFilter = getBlockchainFilter(req.query, true)
  const totalCount = (await findAllCollections({ blockchainFilter })).length
  const collectionAddress = tryOrUndefined(() => getString(req.query, 'collectionAddress'))
  const offset = tryOrUndefined(() => getNumber(req.query, 'offset'))
  const count = tryOrUndefined(() => getNumber(req.query, 'count'))

  if (collectionAddress) {
    const pools = await getPools({
      blockchainFilter,
      collectionAddress,
      offset,
      count,
    })
    const payload = serializePools(pools)
    const nextOffset = (offset ?? 0) + pools.length
    const pagination = serializePagination({ data: payload, totalCount, nextOffset: nextOffset === totalCount - 1 ? undefined : nextOffset })
    res.status(200).json(pagination)
  }
  else {
    try {
      const pools = await getAggregatedPools({ blockchainFilter, count, offset })
      const payload = serializeAggregatedPools(pools)
      const nextOffset = (offset ?? 0) + pools.length
      const pagination = serializePagination({ data: payload, totalCount, nextOffset: nextOffset === totalCount - 1 ? undefined : nextOffset })
      res.status(200).json(pagination)
    }
    catch (err) {
      next(failure('FETCH_AGGREGATED_POOLS_FAILURE', err))
    }
  }
})

router.get('/eth/:address', async (req, res, next) => {
  const blockchain = getBlockchain(req.query)
  const poolAddress = req.params.address

  try {
    const pool = await getPool({ blockchain, poolAddress })
    const payload = serializePool(pool)
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_POOL_FAILURE', err))
  }
})

export default router
