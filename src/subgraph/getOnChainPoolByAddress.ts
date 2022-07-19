import { gql } from 'graphql-request'
import fault from '../utils/fault'
import getRequest, { Options } from './utils/getRequest'

type Params = {
  poolAddress: string
}

export default async function getOnChainPoolByAddress({ poolAddress }: Params, options: Options) {
  const request = getRequest(gql`
    query pools($id: ID!) {
      pool(id: $id) {
        id
        totalUtilization
        collection
      }
    }
  `)

  return request({ id: poolAddress.toLowerCase() }, options)
    .catch(err => {
      throw fault('ERR_GQL_BAD_REQUEST', undefined, err)
    })
}
