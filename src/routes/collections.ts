import { Router } from 'express'
import getAggregatedPools from '../core/getAggregatedPools'
import { serializeAggregatedPool } from '../entities/lib/AggregatedPool'
import { parseEthNetworkId } from '../utils/ethereum'
import failure from '../utils/failure'

const router = Router()

router.get('/ethereum/:collectionAddress/pools', async (req, res, next) => {
  const networkId = parseEthNetworkId(req.query.networkId)
  const collectionAddress = req.params.collectionAddress

  try {
    const pools = await getAggregatedPools({ blockchains: { ethereum: networkId }, collectionAddress })
    const payload = serializeAggregatedPool(pools[0])
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_AGGREGATED_POOLS_FAILURE', err))
  }
})

export default router
