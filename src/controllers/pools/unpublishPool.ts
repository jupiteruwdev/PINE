import _ from 'lodash'
import { PoolModel } from '../../db'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'

type Params = {
  blockchain: Blockchain
  poolAddress: string
}

export default async function unpublishPool({
  poolAddress,
  blockchain,
}: Params) {
  logger.info(`Unpublishing pool for address <${poolAddress}>`)

  try {
    switch (blockchain.network) {
    case 'ethereum':
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
