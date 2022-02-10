import Collection from './Collection'

type NFT = {
  collection: Collection
  id: string
  imageUrl: string
  name: string
  ownerAddress?: string
}

export default NFT
