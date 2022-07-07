import { Router } from 'express'
import getPool from '../controllers/getPool'
import searchPoolGroups from '../controllers/searchPoolGroups'
import { countAllPools } from '../db'
import { Pagination, Pool, PoolGroup, serializeEntityArray } from '../entities'
import fault from '../utils/fault'
import { getBlockchain, getBlockchainFilter, getNumber, getString } from '../utils/query'
import { SortDirection, SortType } from '../utils/sort'
import tryOrUndefined from '../utils/tryOrUndefined'

const router = Router()

router.get('/groups/collection', async (req, res, next) => {
  try {
    const blockchainFilter = getBlockchainFilter(req.query, true)
    const collectionAddress = getString(req.query, 'collectionAddress')
    const poolGroups = await searchPoolGroups({ blockchainFilter, collectionAddress })
    const payload = serializeEntityArray(poolGroups, PoolGroup.codingResolver)

    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_POOL_GROUP_BY_COLLECTION', undefined, err))
  }
})

router.get('/groups/search', async (req, res, next) => {
  try {
    const blockchainFilter = getBlockchainFilter(req.query, true)
    const collectionAddress = tryOrUndefined(() => getString(req.query, 'collectionAddress'))
    const offset = tryOrUndefined(() => getNumber(req.query, 'offset'))
    const count = tryOrUndefined(() => getNumber(req.query, 'count'))
    const collectionName = tryOrUndefined(() => getString(req.query, 'query'))
    const sortBy = tryOrUndefined(() => getString(req.query, 'sort')) as SortType
    const sortDirection = tryOrUndefined(() => getString(req.query, 'direction')) as SortDirection
    const totalCount = await countAllPools({ collectionAddress, blockchainFilter, collectionName })
    const poolGroups = await searchPoolGroups({ collectionAddress, blockchainFilter, count, offset, collectionName, sortBy, sortDirection })
    const payload = serializeEntityArray(poolGroups, PoolGroup.codingResolver)
    const nextOffset = (offset ?? 0) + poolGroups.length
    const pagination = Pagination.serialize({ data: payload, totalCount, nextOffset: nextOffset === totalCount - 1 ? undefined : nextOffset })

    res.status(200).json(pagination)
  }
  catch (err) {
    next(fault('ERR_API_SEARCH_POOL_GROUPS', undefined, err))
  }
})

router.get('/:poolAddress', async (req, res, next) => {
  try {
    const blockchain = getBlockchain(req.query)
    const poolAddress = getString(req.params, 'poolAddress')
    const pool = await getPool({ blockchain, poolAddress })
    const payload = Pool.serialize(pool)

    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_POOL', undefined, err))
  }
})

export default router
