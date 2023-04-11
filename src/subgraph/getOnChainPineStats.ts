import { gql } from 'graphql-request'
import fault from '../utils/fault'
import getRequest, { Options } from './utils/getRequest'

export default async function getOnChainPineStats({ networkId, useCache }: Options = {}) {
  const request = getRequest(gql`
    query {
      pineStat(id: "1") {
        id
        staked
        burnt
      }
    }
  `)

  return request({}, { networkId, useCache })
    .catch(err => {
      throw fault('ERR_GQL_BAD_REQUEST', undefined, err)
    })
}
