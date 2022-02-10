import Blockchain from './Blockchain'

type Collection = {
  address: string
  blockchain: Blockchain
  id: string // Slug
  imageUrl: string
  name: string
}

export default Collection
