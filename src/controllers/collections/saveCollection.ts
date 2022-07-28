import { NFTCollectionModel } from '../../db'
import { Blockchain } from '../../entities'
import logger from '../../utils/logger'
import getCollectionMetadataByAddress from './getCollectionMetadataByAddress'

type Params = {
  collectionAddress: string
  blockchain: Blockchain
}

export default async function saveCollection({ collectionAddress, blockchain }: Params): Promise<any> {
  logger.info(`Saving collection for address <${collectionAddress}>`)
  const collectionMetadata = await getCollectionMetadataByAddress({ collectionAddress: collectionAddress.toLowerCase(), blockchain })

  const collection = new Promise<any>((resolve, reject) => NFTCollectionModel.insertMany([{
    vendorIds: collectionMetadata.vendorIds,
    address: collectionAddress.toLowerCase(),
    displayName: collectionMetadata.name,
    imageUrl: collectionMetadata.image,
    networkType: blockchain.network,
    networkId: blockchain.networkId,
  }]).finally(async () => {
    const collection = await NFTCollectionModel.findOne({
      address: collectionAddress.toLowerCase(),
    }).lean()

    resolve(collection)
  }))

  return collection
}
