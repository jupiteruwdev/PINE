import { gql } from 'graphql-request'
import fault from '../utils/fault'
import getRequest, { Options } from './utils/getRequest'

type Params = {
  lenderAddress: string
}

export default async function getOnChainPoolsByLenderAddress({ lenderAddress }: Params, options: Options) {
  const request = getRequest(gql`
    query pools($lenderAddress: String!) {
      pools(where: {lenderAddress: $lenderAddress}) {
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

  return request({ lenderAddress: lenderAddress.toLowerCase() }, options)
    .catch(err => {
      throw fault('ER_GQL_BAD_REQUEST', undefined, err)
    })
}
