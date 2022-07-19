import { gql } from 'graphql-request'
import fault from '../utils/fault'
import getRequest, { Options } from './utils/getRequest'

type Params = {
  loanId: string
}

export default async function getOnChainLoanById({ loanId }: Params, options: Options) {
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
    .catch(err => {
      throw fault('ERR_GQL_BAD_REQUEST', undefined, err)
    })
}
