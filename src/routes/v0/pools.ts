import { Router } from 'express'
import { countPools, getPool, getUnpublishedPoolsByLenderAndAddress, publishPool, searchPoolGroups } from '../../controllers'
import searchPools, { PoolSortDirection, PoolSortType } from '../../controllers/pools/searchPools'
import { Pagination, Pool, PoolGroup, serializeEntityArray } from '../../entities'
import fault from '../../utils/fault'
import { getBlockchain, getBlockchainFilter, getNumber, getString } from '../utils/query'

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
    const collectionAddress = getString(req.query, 'collectionAddress', { optional: true })
    const collectionName = getString(req.query, 'query', { optional: true })
    const sortByType = getString(req.query, 'sort', { optional: true }) as PoolSortType
    const sortByDirection = getString(req.query, 'direction', { optional: true }) as PoolSortDirection
    const sortBy = sortByType !== undefined ? { type: sortByType, direction: sortByDirection ?? PoolSortDirection.ASC } : undefined
    const paginateByOffset = getNumber(req.query, 'offset', { optional: true })
    const paginateByCount = getNumber(req.query, 'count', { optional: true })
    const paginateBy = paginateByOffset !== undefined && paginateByCount !== undefined ? { count: paginateByCount, offset: paginateByOffset } : undefined
    const totalCount = await countPools({ collectionAddress, blockchainFilter, collectionName })
    const poolGroups = await searchPoolGroups({ collectionAddress, collectionName, blockchainFilter, paginateBy, sortBy })
    const payload = serializeEntityArray(poolGroups, PoolGroup.codingResolver)
    const nextOffset = (paginateBy?.offset ?? 0) + poolGroups.length
    const pagination = Pagination.serialize({ data: payload, totalCount, nextOffset: nextOffset === totalCount ? undefined : nextOffset })

    res.status(200).json(pagination)
  }
  catch (err) {
    next(fault('ERR_API_SEARCH_POOL_GROUPS', undefined, err))
  }
})

router.get('/lender', async (req, res, next) => {
  try {
    const blockchainFilter = getBlockchainFilter(req.query, true)
    const lenderAddress = getString(req.query, 'lenderAddress')
    const paginateByOffset = getNumber(req.query, 'offset', { optional: true })
    const paginateByCount = getNumber(req.query, 'count', { optional: true })
    const paginateBy = paginateByOffset !== undefined && paginateByCount !== undefined ? { count: paginateByCount, offset: paginateByOffset } : undefined
    const publishedPools = await searchPools({
      blockchainFilter,
      lenderAddress,
    })
    const unpublishedPools = await getUnpublishedPoolsByLenderAndAddress({
      blockchainFilter, lenderAddress,
    })
    const totalCount = [...publishedPools, ...unpublishedPools].length
    const currentPagePools = [...publishedPools, ...unpublishedPools].slice(paginateByOffset, (paginateByOffset ?? 0) + (paginateByCount ?? 0))
    const payload = serializeEntityArray(currentPagePools, Pool.codingResolver)
    const nextOffset = (paginateBy?.offset ?? 0) + currentPagePools.length
    const pagination = Pagination.serialize({ data: payload, totalCount, nextOffset: nextOffset === totalCount ? undefined : nextOffset })

    res.status(200).json(pagination)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_POOL_BY_LENDER_ADDRESS', undefined, err))
  }
})

router.get('/:poolAddress', async (req, res, next) => {
  try {
    const blockchain = getBlockchain(req.query)
    const poolAddress = getString(req.params, 'poolAddress')
    const pool = await getPool({ blockchain, address: poolAddress, includeStats: true })
    const payload = Pool.serialize(pool)

    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_POOL', undefined, err))
  }
})

router.post('/:poolAddress', async (req, res, next) => {
  try {
    const blockchain = getBlockchain(req.query)
    const poolAddress = getString(req.params, 'poolAddress')
    const pool = await publishPool({ blockchain, poolAddress })

    res.status(200).json(pool)
  }
  catch (err) {
    next(fault('ERR_API_PUBLISH_POOL', undefined, err))
  }
})

export default router
