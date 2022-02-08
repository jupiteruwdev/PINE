import Blockchain from './Blockchain'

type Collection = {
  address: string
  blockchain: Blockchain
  id: string // slug
  image_url: string
  name: string
}

export default Collection
