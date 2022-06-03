import { Router } from 'express'
import _ from 'lodash'
import getAggregatedPools from '../core/getAggregatedPools'
import getPool from '../core/getPool'
import getPools from '../core/getPools'
import { findAll as findAllCollections } from '../db/collections'
import { serializeAggregatedPools } from '../entities/lib/AggregatedPool'
import { EthBlockchain } from '../entities/lib/Blockchain'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import { serializePagination } from '../entities/lib/Pagination'
import { serializePool, serializePools } from '../entities/lib/Pool'
import failure from '../utils/failure'
import mapBlockchainFilterToDict from '../utils/mapBlockchainFilterToDict'

const router = Router()

router.get('/', async (req, res, next) => {
  const blockchains = _.mapValues(mapBlockchainFilterToDict(req.query, true), t => t.networkId)
  const totalCount = (await findAllCollections({ blockchains })).length
  const collectionAddress = req.query.collectionAddress?.toString().toLowerCase()
  const offset = req.query.offset ? Number(req.query.offset.toString()) : undefined
  const count = req.query.count ? Number(req.query.count?.toString()) : undefined

  if (collectionAddress) {
    const pools = await getPools({
      blockchains,
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
      const pools = await getAggregatedPools({ blockchains, count, offset })
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
  const networkId = _.toNumber(req.query.networkId ?? EthereumNetwork.MAIN)
  const poolAddress = req.params.address

  try {
    const pool = await getPool({ blockchain: EthBlockchain(networkId), poolAddress })
    const payload = serializePool(pool)
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_POOL_FAILURE', err))
  }
})

export default router
