import _ from 'lodash'
import { PipelineStage } from 'mongoose'
import { NFTCollectionModel } from '../../db'
import { Blockchain } from '../../entities'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import { getEthNFTMetadata } from '../collaterals'

type Params = {
  blockchain: Blockchain
  collectionAddress?: string
  matchSubcollectionBy?: {
    value: string
    type: 'nftId'
  }
}

export default async function verifyCollectionWithMatcher({ blockchain, collectionAddress, matchSubcollectionBy }: Params) {
  logger.info('...using db to look up metadata for collection')

  if (blockchain?.network !== 'ethereum') rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

  if (collectionAddress === undefined) rethrow('Parameter `collectionAddress` is required unless pool address is provided')

  const stages: PipelineStage[] = [{
    $match: {
      'networkType': blockchain.network,
      'networkId': blockchain.networkId,
      'address': {
        $regex: collectionAddress,
        $options: 'i',
      },
    },
  }]

  const docs = await NFTCollectionModel.aggregate(stages).exec()

  if (docs.length === 0) rethrow('No matching collection found in db')

  const docsWithMatcher = docs.filter(t => _.isString(_.get(t, 'matcher.regex')) && _.isString(_.get(t, 'matcher.fieldPath')))

  if (docsWithMatcher.length > 0) {
    const nftId = matchSubcollectionBy?.value
    const nftMetadata = await getEthNFTMetadata({ blockchain, collectionAddress: docs[0].address, nftId })
    const nftProps = { id: nftId, ...nftMetadata }

    const doc = _.find(docsWithMatcher, t => {
      const regex = new RegExp(t.matcher.regex)
      if (regex.test(_.get(nftProps, t.matcher.fieldPath))) return true
      return false
    })

    if (!doc) rethrow('No matching collection found in db')
  }
  else {
    if (docs.length > 1) rethrow('Unable to determine collection due to more than 1 collection found')

    const doc = docs[0]

    if (doc.matcher !== undefined) rethrow('Matcher expected for found collection')
  }
}
