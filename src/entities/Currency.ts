import Blockchain from './Blockchain'

type Currency = {
  address?: string
  blockchain: Blockchain
  name: string
}

export default Currency
