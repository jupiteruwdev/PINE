import { gql } from 'graphql-request'
import fault from '../utils/fault'
import getRequest, { Options } from './utils/getRequest'

type Params = {
  lenderAddress: string
  timestamp?: number
}

export default async function getOnChainPoolsByLenderAddress({ lenderAddress, timestamp }: Params, { networkId, useCache }: Options = {}) {
  const request = getRequest(gql`
    query pools($lenderAddress: String!${timestamp ? ', $timestamp: Int' : ''}) {
      pools(first: 1000, where: { lenderAddress: $lenderAddress${timestamp ? ', createAt_gte: $timestamp' : ''} }) {
        id
        totalUtilization
        collection
        supportedCurrency
        target
        fundSource
        duration
        interestBPS1000000XBlock
        collateralFactorBPS
        lenderAddress
      }
    }
  `)

  return request({ lenderAddress: lenderAddress.toLowerCase(), timestamp }, { networkId, useCache })
    .then(res => res.pools)
    .catch(err => {
      throw fault('ERR_GQL_BAD_REQUEST', undefined, err)
    })
}
