import { getCollectionMetadata } from '.'
import { NFTCollectionModel } from '../../db'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'

type Params = {
  collectionAddress: string
  blockchain: Blockchain
}

export default async function saveCollection({ collectionAddress, blockchain }: Params): Promise<any> {
  logger.info(`Saving collection for address <${collectionAddress}>`)
  try {
    const collectionMetadata = await getCollectionMetadata({ collectionAddress: collectionAddress.toLowerCase(), blockchain })
    const res = NFTCollectionModel.create({
      vendorIds: collectionMetadata.vendorIds,
      address: collectionAddress.toLowerCase(),
      displayName: collectionMetadata.name,
      imageUrl: collectionMetadata.imageUrl,
      networkType: blockchain.network,
      networkId: blockchain.networkId,
    })

    return res
  } catch (err) {
    throw fault('ERR_SAVE_COLLECTION', undefined, err)
  }
}
