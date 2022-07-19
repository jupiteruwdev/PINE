import { gql } from 'graphql-request'
import getRequest, { Options } from './utils/getRequest'

type Params = {
  loanId: string
}

export default function getOnChainLoanById({ loanId }: Params, options: Options) {
  const request = getRequest(gql`
    query loan($id: ID!) {
      loan(id: $id) {
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

  return request({ id: loanId }, options)
}
