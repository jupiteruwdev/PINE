import { gql } from 'graphql-request'
import fault from '../utils/fault'
import getRequest, { Options } from './utils/getRequest'

type Params = {
  poolAddresses: string[]
}

export default async function getOnChainLoansByPools({ poolAddresses }: Params, options: Options): Promise<any[]> {
  const request = getRequest(gql`
    query loans($pools: [String]) {
      loans(where: {pool_in: $pools, status: "open"}) {
        accuredInterestWei
        borrowedWei
        borrower
        erc721
        id
        interestBPS1000000XBlock
        loanExpiretimestamp
        loanStartBlock
        maxLTVBPS
        pool
        repaidInterestWei
        returnedWei
        status
      }
    }
  `)

  return request({ pools: poolAddresses.map(t => t.toLowerCase()) }, options)
    .then(res => res.loans)
    .catch(err => {
      throw fault('ERR_GQL_BAD_REQUEST', undefined, err)
    })
}
