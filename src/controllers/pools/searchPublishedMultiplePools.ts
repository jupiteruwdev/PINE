import _ from 'lodash'
import { PipelineStage } from 'mongoose'
import appConf from '../../app.conf'
import { PoolModel } from '../../database'
import { Blockchain, Pool } from '../../entities'
import fault from '../../utils/fault'
import { mapPool } from '../adapters'
import { getEthNFTMetadata } from '../collaterals'
import Tenor from '../utils/Tenor'

export enum PoolSortType {
  NAME = 'name',
  LTV = 'ltv',
  INTEREST = 'interest',
}

export enum PoolSortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

type Params = {
  blockchainFilter?: Blockchain.Filter
  collectionAddresses?: string[]
  addresses?: string[]
  collectionName?: string
  includeRetired?: boolean
  lenderAddress?: string
  tenors?: number[]
  nftIds?: string[]
  paginateBy?: {
    count: number
    offset: number
  }
  sortBy?: {
    type: PoolSortType
    direction: PoolSortDirection
  }
  includeInvalidTenors?: boolean
}

export async function filterByNftId(blockchain: Blockchain, docs: any[], nftIds: string[], collectionAddresses?: string[]): Promise<any[]> {
  try {
    if (docs.length) {
      const subDocs: any[] = []
      if (!collectionAddresses) collectionAddresses = _.uniq(docs.map(doc => doc.collection.address))
      const regexDocs = docs.filter(doc => _.isString(_.get(doc, 'collection.matcher.regex')) && _.isString(_.get(doc, 'collection.matcher.fieldPath')))
      for (const doc of regexDocs) {
        const nftId = (collectionAddresses || [])?.indexOf(doc.collection.address)
        if (nftId >= 0) {
          const metadata = await getEthNFTMetadata({ blockchain, collectionAddress: doc.collection.address, nftId: nftIds[nftId] })
          const nftProps = { id: nftIds[nftId], ...metadata }
          const regex = new RegExp(doc.collection.matcher.regex)
          if (regex.test(_.get(nftProps, doc.collection.matcher.fieldPath))) {
            subDocs.push(doc)
          }
        }
      }

      return _.xor(docs, regexDocs).concat(subDocs)
    }
    return docs
  }
  catch (err) {
    throw fault('ERR_SEARCH_PUBLISHED_MULTIPLE_POOLS_FILTER_BY_NFT_ID', undefined, err)
  }
}

async function searchPublishedMultiplePools({
  paginateBy,
  includeInvalidTenors = true,
  ...params
}: Params): Promise<Pool[]> {
  try {
    const aggregation = PoolModel.aggregate(getPipelineStages({
      ...params,
    }))

    let docs
    if (params.nftIds !== undefined) {
      docs = await aggregation.exec()
      docs = await filterByNftId(Blockchain.parseBlockchain(params.blockchainFilter ?? {}), docs, params.nftIds, params.collectionAddresses)

      if (paginateBy !== undefined) {
        docs = docs.slice(paginateBy.offset, paginateBy.offset + paginateBy.count - 1)
      }
    }
    else {
      docs = paginateBy === undefined ? await aggregation.exec() : await aggregation.skip(paginateBy.offset).limit(paginateBy.count).exec()
    }

    const pools = docs.map(mapPool)

    if (includeInvalidTenors) {
      return pools
    }

    const filteredPools: Pool[] = []
    pools.forEach(pool => {
      const filteredLoanOptions = pool.loanOptions.filter(loanOption => appConf.tenors.find(tenor => Math.abs(Tenor.convertTenor(tenor) - loanOption.loanDurationSeconds) <= 1))
      if (filteredLoanOptions.length) {
        pool.loanOptions = filteredLoanOptions
        filteredPools.push(pool)
      }
    })

    return filteredPools
  }
  catch (err) {
    throw fault('ERR_SEARCH_PUBLISHED_MULTIPLE_POOLS', undefined, err)
  }
}

export default searchPublishedMultiplePools

function getPipelineStages({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    polygon: Blockchain.Polygon.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
    arbitrum: Blockchain.Arbitrum.Network.MAINNET,
    avalanche: Blockchain.Avalanche.Network.MAINNET,
  },
  collectionAddresses,
  collectionName,
  includeRetired = false,
  lenderAddress,
  sortBy,
  addresses,
  tenors,
}: Params): PipelineStage[] {
  try {
    const blockchains = Blockchain.fromFilter(blockchainFilter)

    const collectionFilter = [
      ...collectionAddresses === undefined ? [] : [{
        'collection.address': {
          $regex: collectionAddresses.join('|'),
          $options: 'i',
        },
      }],
      ...collectionName === undefined ? [] : [{
        'collection.displayName': {
          $regex: `.*${collectionName}.*`,
          $options: 'i',
        },
      }],
    ]
    const poolFilter = [
      ...addresses === undefined ? [] : [{
        'address': {
          $regex: addresses.join('|'),
          $options: 'i',
        },
      }],
      ...tenors === undefined ? [] : [{
        'loanOptions.loanDurationSecond': {
          $in: Tenor.convertTenors(tenors),
        },
      }],
    ]

    const stages: PipelineStage[] = [{
      $match: {
        ...blockchains?.length ? {
          '$or': blockchains.map(blockchain => ({
            $and: [
              { 'networkType': blockchain.network },
              { 'networkId': blockchain.networkId },
            ],
          })) } : {},
        ...lenderAddress === undefined ? {} : { lenderAddress },
        ...includeRetired === true ? {} : { retired: { $ne: true } },
      },
    }, {
      $lookup: {
        from: 'nftCollections',
        localField: 'nftCollection',
        foreignField: '_id',
        as: 'collection',
      },
    }, {
      $unwind: '$collection',
    },
    ...collectionFilter.length === 0 ? [] : [{
      $match: { $and: collectionFilter },
    }],
    ...poolFilter.length === 0 ? [] : [{
      $match: { $and: poolFilter },
    }], {
      $addFields: {
        name: {
          $toLower: {
            $trim: {
              input: '$collection.displayName',
              chars: '"',
            },
          },
        },
        interest: {
          $toDouble: {
            $min: '$loanOptions.interestBpsBlock',
          },
        },
        interestOverride: {
          $min: '$loanOptions.interestBpsBlockOverride',
        },
        maxLTV: {
          $max: '$loanOptions.maxLtvBps',
        },
      },
    }, {
      $addFields: {
        lowestAPR: {
          $cond: {
            if: {
              $ne: ['$interestOverride', null],
            },
            then: '$interestOverride',
            else: '$interest',
          },
        },
      },
    },
    {
      $match: {
        'valueLockedEth': {
          $gte: 0.01,
        },
      },
    },
    ]

    switch (sortBy?.type) {
    case PoolSortType.NAME:
      stages.push({
        $sort: {
          name: sortBy?.direction === PoolSortDirection.DESC ? -1 : 1,
        },
      })
      break
    case PoolSortType.INTEREST:
      stages.push({
        $sort: {
          lowestAPR: sortBy?.direction === PoolSortDirection.DESC ? -1 : 1,
          name: 1,
        },
      })
      break
    case PoolSortType.LTV:
      stages.push({
        $sort: {
          maxLTV: sortBy?.direction === PoolSortDirection.DESC ? -1 : 1,
          name: 1,
        },
      })
      break
    }

    return stages
  }
  catch (err) {
    throw fault('ERR_SEARCH_PUBLISHED_MULTIPLE_POOLS_GET_PIPELINE_STAGES', undefined, err)
  }
}
