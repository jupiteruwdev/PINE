import { PipelineStage } from 'mongoose'
import { PoolModel } from '../../db'
import { Blockchain } from '../../entities'

type Params = {
  blockchainFilter?: Blockchain.Filter
  collectionAddress?: string
  collectionName?: string
  includeRetired?: boolean
}

export default async function countPools(params: Params = {}): Promise<number> {
  const aggregation = PoolModel.aggregate(getPipelineStages(params))
  const res = await aggregation.count('count').exec()
  const count = res[0]?.count ?? 0

  return count
}

function getPipelineStages({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
  collectionAddress,
  collectionName,
  includeRetired = false,
}: Params): PipelineStage[] {
  const blockchain = Blockchain.Ethereum(blockchainFilter.ethereum)

  const collectionFilter = [
    ...collectionAddress === undefined ? [] : [{
      'collection.address': collectionAddress,
    }],
    ...collectionName === undefined ? [] : [{ 'collection.displayName': {
      $regex: `.*${collectionName}.*`,
      $options: 'i',
    }}],
  ]

  return [{
    $match: {
      'networkType': blockchain.network,
      'networkId': parseInt(blockchain.networkId, 10),
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
    $match: {
      $and: collectionFilter,
    },
  }]]
}
