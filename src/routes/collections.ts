import { Router } from 'express'
import _ from 'lodash'
import getAggregatedPools from '../core/getAggregatedPools'
import { serializeAggregatedPool } from '../entities/lib/AggregatedPool'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import { parseEthNetworkId } from '../utils/ethereum'
import failure from '../utils/failure'

const router = Router()

router.get('/ethereum/:collectionAddress/pools', async (req, res, next) => {
  const networkId = _.toNumber(req.query.networkId ?? EthereumNetwork.MAIN)
  const collectionAddress = req.params.collectionAddress

  try {
    const pools = await getAggregatedPools({ blockchains: { ethereum: parseEthNetworkId(networkId) }, collectionAddress })
    const payload = serializeAggregatedPool(pools[0])
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_AGGREGATED_POOLS_FAILURE', err))
  }
})

export default router
