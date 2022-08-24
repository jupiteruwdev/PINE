import _ from 'lodash'
import { PoolModel } from '../../db'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import authenticatePoolPublisher from './authenticatePoolPublisher'

type Params = {
  blockchain: Blockchain
  poolAddress: string
  payload: string
  signature: string
}

export default async function unpublishPool({
  poolAddress,
  blockchain,
  payload,
  signature,
}: Params) {
  logger.info(`Unpublishing pool for address <${poolAddress}>`)

  try {
    switch (blockchain.network) {
    case 'ethereum':
      await authenticatePoolPublisher({ poolAddress, payload, signature, networkId: blockchain.networkId })

      const res = await PoolModel.findOneAndDelete({
        address: {
          '$regex': poolAddress,
          '$options': 'i',
        },
      }).exec()

      if (_.isNull(res)) throw fault('ERR_UNPUBLISH_POOL_POOL_NOT_FOUND')

      break
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }
  }
  catch (err) {
    throw fault('ERR_UNPUBLISH_POOL', undefined, err)
  }
}
