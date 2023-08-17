import { NFTCollectionModel } from '../../database'
import { Blockchain } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import getEthCollectionImage from './getEthCollectionImage'
import getEthCollectionMetadata from './getEthCollectionMetadata'

type Params = {
  collectionAddress: string
  blockchain: Blockchain
}

export default async function saveCollection({ collectionAddress, blockchain }: Params): Promise<any> {
  logger.info(`Saving collection for address <${collectionAddress}>`)
  try {
    const collectionMetadata = await getEthCollectionMetadata({ collectionAddress, blockchain })
    if (!collectionMetadata.imageUrl?.length) {
      collectionMetadata.imageUrl = await getEthCollectionImage({ collectionAddress, blockchain })
    }
    const res = await NFTCollectionModel.create({
      vendorIds: collectionMetadata.vendorIds,
      address: collectionAddress.toLowerCase(),
      displayName: collectionMetadata.name,
      imageUrl: collectionMetadata.imageUrl ?? '',
      networkType: blockchain.network,
      networkId: blockchain.networkId,
      hidden: false,
    })

    return res.toObject()
  }
  catch (err) {
    throw fault('ERR_SAVE_COLLECTION', undefined, err)
  }
}
