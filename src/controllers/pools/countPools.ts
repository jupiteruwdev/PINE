import { PoolModel } from '../../db'
import { Blockchain } from '../../entities'

type Params = {
  blockchainFilter?: Blockchain.Filter
  collectionAddress?: string
  collectionName?: string
  includeRetired?: boolean
}

export default async function countPools({
  blockchainFilter = {
    ethereum: Blockchain.Ethereum.Network.MAIN,
    solana: Blockchain.Solana.Network.MAINNET,
  },
  collectionAddress,
  collectionName,
  includeRetired = false,
}: Params = {}): Promise<number> {
  let count = 0
  if (blockchainFilter.ethereum !== undefined) {
    const blockchain = Blockchain.Ethereum(blockchainFilter.ethereum)

    const filter: Record<string, any>[] = [
      {
        'collection.networkType': blockchain.network,
      },
      {
        'collection.networkId': parseInt(blockchain.networkId, 10),
      },
    ]

    if (collectionAddress !== undefined) {
      filter.push({
        'collection.address': collectionAddress,
      })
    }

    if (collectionName !== undefined) {
      filter.push({
        'collection.displayName': {
          $regex: `.*${collectionName}.*`,
          $options: 'i',
        },
      })
    }

    if (!includeRetired) {
      filter.push({
        retired: {
          $ne: true,
        },
      })
    }

    const aggregation = PoolModel.aggregate([
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
          $and: filter,
        },
      },
    ])

    const poolsCount = await aggregation.count('count').exec()
    if (poolsCount?.length) { count = poolsCount[0].count }
  }
  return count
}
