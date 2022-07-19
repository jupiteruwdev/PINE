import { gql } from 'graphql-request'
import getRequest, { Options } from './utils/getRequest'

type Params = {
  poolAddresses: string[]
}

export default function getOnChainLoansByPools({ poolAddresses }: Params, options: Options) {
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
}
