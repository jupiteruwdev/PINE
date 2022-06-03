import { Router } from 'express'
import _ from 'lodash'
import getAggregatedPools from '../core/getAggregatedPools'
import { serializeAggregatedPool } from '../entities/lib/AggregatedPool'
import failure from '../utils/failure'
import mapBlockchainFilterToDict from '../utils/mapBlockchainFilterToDict'

const router = Router()

router.get('/ethereum/:collectionAddress/pools', async (req, res, next) => {
  const collectionAddress = req.params.collectionAddress
  const blockchains = _.mapValues(mapBlockchainFilterToDict(req.query, true), t => t.networkId)

  try {
    const pools = await getAggregatedPools({ blockchains, collectionAddress })
    const payload = serializeAggregatedPool(pools[0])
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_AGGREGATED_POOLS_FAILURE', err))
  }
})

export default router
