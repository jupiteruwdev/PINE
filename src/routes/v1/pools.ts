import { Router } from 'express'
import _ from 'lodash'
import appConf from '../../app.conf'
import { countPoolGroups, countPools, countPoolsByTenors, getPool, getPools, publishPool, searchPoolGroups, syncPools, unpublishPool } from '../../controllers'
import searchPublishedPools, { PoolSortDirection, PoolSortType } from '../../controllers/pools/searchPublishedPools'
import { Pagination, Pool, PoolGroup, serializeEntityArray } from '../../entities'
import fault from '../../utils/fault'
import { getBlockchain, getBlockchainFilter, getBoolean, getNumber, getString } from '../utils/query'

const router = Router()

router.get('/groups/collection', async (req, res, next) => {
  try {
    const blockchainFilter = getBlockchainFilter(req.query, false)
    const collectionAddress = getString(req.query, 'collectionAddress')
    const ownerAddress = getString(req.query, 'ownerAddress', { optional: true })
    const poolGroups = await searchPoolGroups({ blockchainFilter, collectionAddress, ownerAddress })
    const payload = serializeEntityArray(poolGroups, PoolGroup.codingResolver)

    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_POOL_GROUP_BY_COLLECTION', undefined, err))
  }
})

router.get('/groups/search', async (req, res, next) => {
  try {
    const blockchainFilter = getBlockchainFilter(req.query, false)
    const collectionAddress = getString(req.query, 'collectionAddress', { optional: true })
    const collectionName = getString(req.query, 'query', { optional: true })
    const sortByType = getString(req.query, 'sort', { optional: true }) as PoolSortType
    const sortByDirection = getString(req.query, 'direction', { optional: true }) as PoolSortDirection
    const sortBy = sortByType !== undefined ? { type: sortByType, direction: sortByDirection ?? PoolSortDirection.ASC } : undefined
    const paginateByOffset = getNumber(req.query, 'offset', { optional: true })
    const paginateByCount = getNumber(req.query, 'count', { optional: true })
    const paginateBy = paginateByOffset !== undefined && paginateByCount !== undefined ? { count: paginateByCount, offset: paginateByOffset } : undefined
    const totalCount = await countPoolGroups({ collectionAddress, blockchainFilter, collectionName, includeRetired: false })
    const totalPoolGroupsCount = await countPoolGroups({ collectionAddress, blockchainFilter, includeRetired: false })
    const poolGroups = await searchPoolGroups({ collectionAddress, collectionName, blockchainFilter, paginateBy, sortBy })
    const poolsOfferCount = await countPoolOffers({ collectionAddress, blockchainFilter, collectionName, includeRetired: false })
    const payload = serializeEntityArray(poolGroups, PoolGroup.codingResolver)
    const nextOffset = (paginateBy?.offset ?? 0) + poolGroups.length
    const pagination = Pagination.serialize({ data: payload, totalCount, nextOffset: nextOffset === totalCount ? undefined : nextOffset })

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30')
    res.status(200).json({
      poolGroups: pagination,
      offerCount: poolsOfferCount,
      totalPoolGroupsCount,
    })

  }
  catch (err) {
    next(fault('ERR_API_SEARCH_POOL_GROUPS', undefined, err))
  }
})

router.get('/lender', async (req, res, next) => {
  try {
    const blockchainFilter = getBlockchainFilter(req.query, false)
    const lenderAddress = getString(req.query, 'lenderAddress')
    const pools = await getPools({
      blockchainFilter, lenderAddress,
    })
    const payload = serializeEntityArray(pools, Pool.codingResolver)

    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_POOL_BY_LENDER_ADDRESS', undefined, err))
  }
})

router.get('/tenors', async (req, res, next) => {
  try {
    const tenors = appConf.tenors

    res.status(200).json({ tenors })
  }
  catch (err) {
    next(fault('ERR_API_GET_TENORS', undefined, err))
  }
})

router.get('/tenors/count', async (req, res, next) => {
  try {
    const nftId = getString(req.query, 'nftId', { optional: true })
    const blockchainFilter = getBlockchainFilter(req.query, false)
    const collectionAddress = getString(req.query, 'collectionAddress', { optional: true })
    const count = await countPoolsByTenors({ blockchainFilter, collectionAddress, nftId })

    res.status(200).json({ count })
  }
  catch (err) {
    next(fault('ERR_API_GET_TENORS', undefined, err))
  }
})

router.get('/:poolAddress', async (req, res, next) => {
  try {
    const blockchain = getBlockchain(req.query)
    const includeRetired = getBoolean(req.query, 'includeRetired', { optional: true })
    const poolAddress = getString(req.params, 'poolAddress')

    const pool = await getPool({ blockchain, address: poolAddress, includeRetired })
    const payload = Pool.serialize(pool)

    res.status(200).json(payload)
  }
  catch (err) {
    next(fault('ERR_API_FETCH_POOL', undefined, err))
  }
})

router.get('/', async (req, res, next) => {
  try {
    const blockchainFilter = getBlockchainFilter(req.query, false)
    const tenors = (req.query.tenors as string[])?.map(tenor => _.toNumber(tenor))
    const nftId = getString(req.query, 'nftId', { optional: true })
    const collectionAddress = getString(req.query, 'collectionAddress', { optional: true })
    const sortByType = getString(req.query, 'sort', { optional: true }) as PoolSortType
    const sortByDirection = getString(req.query, 'direction', { optional: true }) as PoolSortDirection
    const sortBy = sortByType !== undefined ? { type: sortByType, direction: sortByDirection ?? PoolSortDirection.ASC } : undefined
    const paginateByOffset = getNumber(req.query, 'offset', { optional: true })
    const paginateByCount = getNumber(req.query, 'count', { optional: true })
    const paginateBy = paginateByOffset !== undefined && paginateByCount !== undefined ? { count: paginateByCount, offset: paginateByOffset } : undefined
    const totalCount = await countPools({ collectionAddress, blockchainFilter, tenors, nftId })
    const checkLimit = getBoolean(req.query, 'checkLimit', { optional: true })

    const pools = await searchPublishedPools({
      blockchainFilter,
      collectionAddress,
      tenors,
      sortBy,
      nftId,
      paginateBy,
      checkLimit,
    })

    const payload = serializeEntityArray(pools, Pool.codingResolver)
    const nextOffset = (paginateBy?.offset ?? 0) + pools.length
    const pagination = Pagination.serialize({ data: payload, totalCount, nextOffset: nextOffset === totalCount ? undefined : nextOffset })

    res.status(200).json(pagination)
  }
  catch (err) {
    next(fault('ERR_API_GET_POOLS', undefined, err))
  }
})

router.post('/', async (req, res, next) => {
  try {
    const blockchain = getBlockchain(req.body)
    const poolAddress = _.get(req.body, 'poolAddress')
    const payload = _.get(req.body, 'payload')
    const signature = _.get(req.body, 'signature')
    const ethLimit = _.get(req.body, 'ethLimit')
    const pool = await publishPool({ blockchain, poolAddress, payload, signature, ethLimit })

    res.status(200).json(pool)
  }
  catch (err) {
    next(fault('ERR_API_PUBLISH_POOL', undefined, err))
  }
})

router.post('/sync', async (req, res, next) => {
  try {
    syncPools()

    res.status(200).send({
      success: 'success',
    })
  }
  catch (err) {
    next(fault('ERR_API_SYNC_POOL', undefined, err))
  }
})

router.delete('/', async (req, res, next) => {
  try {
    const blockchain = getBlockchain(req.body)
    const poolAddress = _.get(req.body, 'poolAddress')
    const payload = _.get(req.body, 'payload')
    const signature = _.get(req.body, 'signature')
    const deletedPool = await unpublishPool({ poolAddress, blockchain, payload, signature })

    res.status(200).json(deletedPool)
  }
  catch (err) {
    next(fault('ERR_API_UNPUBLISH_POOL', undefined, err))
  }
})

export default router
