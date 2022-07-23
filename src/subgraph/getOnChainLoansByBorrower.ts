import { gql } from 'graphql-request'
import fault from '../utils/fault'
import getRequest, { Options } from './utils/getRequest'

type Params = {
  borrowerAddress: string
}

export default async function getOnChainLoansByBorrower({ borrowerAddress }: Params, options: Options): Promise<any[]> {
  const request = getRequest(gql`
    query loans($borrower: String) {
      loans(where: {borrower: $borrower, status: "open"}) {
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

  return request({ borrower: borrowerAddress.toLowerCase() }, options)
    .then(res => res.loans)
    .catch(err => {
      throw fault('ERR_GQL_BAD_REQUEST', undefined, err)
    })
}
