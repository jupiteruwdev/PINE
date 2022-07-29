import { gql } from 'graphql-request'
import fault from '../utils/fault'
import getRequest, { Options } from './utils/getRequest'

type Params = {
  lenderAddress?: string
  address?: string
}

export default async function getOnChainPoolsByLenderAndID({ lenderAddress, address }: Params, options: Options) {
  const request = getRequest(gql`
    query pools(${lenderAddress !== undefined ? '$lenderAddress: String' : ''}${address !== undefined ? ', $address: String' : ''}) {
      pools(where: {${lenderAddress !== undefined ? 'lenderAddress: $lenderAddress' : ''}${address !== undefined ? ', id: $address' : ''}}) {
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

  return request({ lenderAddress: lenderAddress?.toLowerCase(), address: address?.toLowerCase() }, options)
    .catch(err => {
      throw fault('ERR_GQL_BAD_REQUEST', undefined, err)
    })
}
