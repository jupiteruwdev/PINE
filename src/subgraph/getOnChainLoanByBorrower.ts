import { gql } from 'graphql-request'
import getRequest, { Options } from './utils/getRequest'

type Params = {
  borrowerAddress: string
}

export default function getOnChainLoanByBorrower({ borrowerAddress }: Params, options: Options) {
  const request = getRequest(gql`
    query loans($borrower: String) {
      loans(where: {borrower: $borrower, status: "open"}) {
        erc721
        id
        pool
        borrowedWei
        returnedWei
        pool
        loanExpiretimestamp
      }
    }
  `)

  return request({ borrower: borrowerAddress.toLowerCase() }, options)
}
