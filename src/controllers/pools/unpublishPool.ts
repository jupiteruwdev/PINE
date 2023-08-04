import _ from 'lodash'
import { NFTCollectionModel, PoolModel } from '../../database'
import { Blockchain, Pool } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { mapPool } from '../adapters'
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
}: Params): Promise<Pool> {
  logger.info(`Unpublishing pool for address <${poolAddress}>`)

  try {
    switch (blockchain.network) {
    case 'ethereum':
    case 'polygon':
      await authenticatePoolPublisher({ poolAddress, payload, signature, networkId: blockchain.networkId })

      const res = await PoolModel.findOneAndDelete({
        address: {
          '$regex': poolAddress,
          '$options': 'i',
        },
      }).exec()

      const collection = await NFTCollectionModel.findById(res?.nftCollection)

      if (_.isNull(res)) throw fault('ERR_UNPUBLISH_POOL_POOL_NOT_FOUND')

      return mapPool({
        ...res.toObject(),
        collection: collection?.toObject(),
      })
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }
  }
  catch (err) {
    throw fault('ERR_UNPUBLISH_POOL', undefined, err)
  }
}
