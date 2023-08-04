import _ from 'lodash'
import { PipelineStage } from 'mongoose'
import appConf from '../../app.conf'
import { PoolModel } from '../../database'
import { Blockchain, NFT } from '../../entities'
import fault from '../../utils/fault'
import Tenor from '../utils/Tenor'

type Params = {
  blockchain: Blockchain
  nfts: NFT[]
}

export default async function populatePoolAvailabilityForNFTs({
  blockchain,
  nfts,
}: Params): Promise<NFT[]> {
  try {
    const addresses = _.uniq(_.map(nfts, 'collection.address'))

    const stages: PipelineStage[] = [{
      $match: {
        'networkType': blockchain.network,
        'networkId': blockchain.networkId,
      },
    },
    {
      $lookup: {
        from: 'nftCollections',
        localField: 'nftCollection',
        foreignField: '_id',
        as: 'collection',
      },
    },
    {
      $unwind: '$collection',
    },
    {
      $match: {
        'retired': { $ne: true },
        'collection.address': {
          $in: addresses.map(addr => new RegExp(addr, 'i')),
        },
        'valueLockedEth': {
          $gte: 0.01,
        },
      },
    },
    ]
    const docs = await PoolModel.aggregate(stages).exec()
    const populatedNfts = await Promise.all(nfts.map(async nft => {
      const hasPools = docs.some(doc => {
        if (doc.collection.address.toLowerCase() === nft.collection.address.toLowerCase()) {
          if (doc.loanOptions.find((loanOption: any) => appConf.tenors.find(tenor => Math.abs(Tenor.convertTenor(tenor) - loanOption.loanDurationSecond) <= 1))) {
            const regexStr = _.get(doc, 'collection.matcher.regex')
            const fieldPath = _.get(doc, 'collection.matcher.fieldPath')
            const hasMatcher = _.isString(regexStr) && _.isString(fieldPath)
            if (hasMatcher) {
              const regex = new RegExp(regexStr)
              if (regex.test(_.get(nft, fieldPath))) return true
              return false
            }
            return true
          }
        }
        return false
      })
      return {
        ...nft,
        hasPools,
      }
    }))

    return populatedNfts
  }
  catch (err) {
    throw fault('ERR_POPULATE_POOL_AVAILABILITY_FOR_NFTS', undefined, err)
  }
}
