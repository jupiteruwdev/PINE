import _ from 'lodash'
import { PipelineStage } from 'mongoose'
import { NFTCollectionModel } from '../../database'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import { getEthNFTMetadata } from '../collaterals'

type Params = {
  blockchain: Blockchain
  collectionAddresses?: string[]
  matchSubcollectionBy?: {
    values: string[]
    type: 'nftId'
  }
}

export default async function verifyCollectionWithMatcher({ blockchain, collectionAddresses, matchSubcollectionBy }: Params) {
  try {
    logger.info('...using db to look up metadata for collection')

    if (blockchain?.network !== 'ethereum' && blockchain.network !== 'polygon') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    if (collectionAddresses === undefined) rethrow('Parameter `collectionAddresses` is required unless pool address is provided')

    const stages: PipelineStage[] = [{
      $match: {
        'networkType': blockchain.network,
        'networkId': blockchain.networkId,
        'address': {
          $regex: collectionAddresses.join('|'),
          $options: 'i',
        },
      },
    }]

    const docs = await NFTCollectionModel.aggregate(stages).exec()

    if (docs.length === 0) rethrow('No matching collection found in db')

    const docsWithMatcher = docs.filter(t => _.isString(_.get(t, 'matcher.regex')) && _.isString(_.get(t, 'matcher.fieldPath')))

    if (docsWithMatcher.length > 0) {
      try {
        await Promise.all(collectionAddresses.map((collectionAddresses, index) =>
          new Promise<void>(async (resolve, reject) => {
            const nftId = matchSubcollectionBy?.values[index]
            const nftMetadata = await getEthNFTMetadata({ blockchain, collectionAddress: collectionAddresses[index], nftId })
            const nftProps = { id: nftId, ...nftMetadata }

            const doc = _.find(docsWithMatcher, t => {
              const regex = new RegExp(t.matcher.regex)
              if (regex.test(_.get(nftProps, t.matcher.fieldPath))) return true
              return false
            })

            if (!doc) reject('No matching collection found in db')
            resolve()
          })))
      }
      catch (err: any) {
        rethrow(err.message)
      }
    }
    else if (docs.find(doc => doc.matcher !== undefined)) { rethrow('Matcher expected for found collection') }
  }
  catch (err) {
    throw fault('ERR_VERIFY_COLLECTION_WITH_MATCHER', undefined, err)
  }
}
