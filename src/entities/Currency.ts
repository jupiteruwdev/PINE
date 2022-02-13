import Blockchain from './Blockchain'

export type AnyCurrency = 'ETH' | 'USD' | 'WEI'

type Currency<T extends AnyCurrency = AnyCurrency> = {
  address?: string
  blockchain?: Blockchain
  name: T
}

export default Currency
