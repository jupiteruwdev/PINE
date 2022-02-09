import { Router } from 'express'
import _ from 'lodash'
import getPool from '../core/getPool'
import { EthBlockchain } from '../entities/Blockchain'
import { EthNetwork } from '../utils/ethereum'
import failure from '../utils/failure'

const router = Router()

router.get('/eth/:address', async (req, res, next) => {
  const networkId = _.toNumber(req.query.network_id ?? EthNetwork.MAIN)
  const poolAddress = req.params.address

  try {
    const payload = await getPool({ poolAddress }, EthBlockchain(networkId))
    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_POOL_FAILURE', err))
  }
})

export default router
