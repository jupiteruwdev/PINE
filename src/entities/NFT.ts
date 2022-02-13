import Collection from './Collection'

export type NFTMetadata = {
  imageUrl: string
  name: string
}

type NFT = Partial<NFTMetadata> & {
  collection: Collection
  id: string
  ownerAddress?: string
}

export default NFT
