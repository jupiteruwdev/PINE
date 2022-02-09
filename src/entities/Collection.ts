import Blockchain from './Blockchain'

type Collection = {
  address: string
  blockchain: Blockchain
  id: string // Slug
  image_url: string
  name: string
}

export default Collection
