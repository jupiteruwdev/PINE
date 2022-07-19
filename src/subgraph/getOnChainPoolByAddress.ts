import { gql } from 'graphql-request'
import getRequest, { Options } from './utils/getRequest'

type Params = {
  poolAddress: string
}

export default function getOnChainPoolByAddress({ poolAddress }: Params, options: Options) {
  const request = getRequest(gql`
    query pools($id: ID!) {
      pool(id: $id) {
        id
        totalUtilization
        collection
      }
    }
  `)

  return request({ pool: poolAddress.toLowerCase() }, options)
}
