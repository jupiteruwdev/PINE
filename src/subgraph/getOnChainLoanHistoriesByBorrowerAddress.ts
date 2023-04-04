import { gql } from 'graphql-request'
import fault from '../utils/fault'
import getRequest, { Options } from './utils/getRequest'

type Params = {
  borrowerAddress: string
  timestamp?: number
}

export default async function getOnChainLoanHistoriesByBorrowerAddress({ borrowerAddress, timestamp }: Params, { networkId, useCache }: Options = {}): Promise<any> {
  const request = getRequest(gql`
    query loanHistories($borrowerAddress: String!${timestamp ? ', $timestamp: Int' : ''}) {
      loanHistories(first: 1000, where: { borrower: $borrowerAddress${timestamp ? ', createAt_gte: $timestamp' : ''} }) {
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
      }
    }
  `)

  return request({ borrowerAddress: borrowerAddress.toLowerCase(), timestamp }, { networkId, useCache })
    .then(res => res.loanHistories)
    .catch(err => {
      throw fault('ERR_GQL_BAD_REQUEST', undefined, err)
    })
}
