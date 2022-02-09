import { RequestHandler } from 'express'
import _ from 'lodash'
import getPool from '../../core/getPool'
import { EthBlockchain } from '../../entities/Blockchain'
import { EthNetwork } from '../../utils/ethereum'
import failure from '../../utils/failure'
import logger from '../../utils/logger'

export default function getEthPool(): RequestHandler {
  return async (req, res, next) => {
    const networkId = _.toNumber(req.query.network_id ?? EthNetwork.MAIN)
    const poolAddress = req.params.address

    try {
      logger.info(`Fetching ETH loan pool for address <${poolAddress}> on network <${networkId}>...`)

      const pool = await getPool({ poolAddress }, EthBlockchain(networkId))

      logger.info(`Fetching ETH loan pool for address <${poolAddress}> on network <${networkId}>... OK`)

      res.status(200).json(pool)
    }
    catch (err) {
      logger.error(`Fetching ETH loan pool for address <${poolAddress}> on network <${networkId}>... ERR`, err)

      next(failure('FETCH_POOL_FAILURE', err))
    }
  }
}
