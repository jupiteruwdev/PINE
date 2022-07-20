import { gql } from 'graphql-request'
import fault from '../utils/fault'
import getRequest, { Options } from './utils/getRequest'

type Params = {
  poolAddresses: string[]
}

export default async function getOnChainLoansByPools({ poolAddresses }: Params, options: Options) {
  const request = getRequest(gql`
    query loans($pools: [String]) {
      loans(where: {pool_in: $pools, status: "open"}) {
        id
        loanStartBlock
        loanExpiretimestamp
        interestBPS1000000XBlock
        maxLTVBPS
        borrowedWei
        returnedWei
        accuredInterestWei
        repaidInterestWei
        borrower
        pool
        erc721
        status
      }
    }
  `)

  return request({ pools: poolAddresses.map(t => t.toLowerCase()) }, options)
    .catch(err => {
      throw fault('ERR_GQL_BAD_REQUEST', undefined, err)
    })
}
