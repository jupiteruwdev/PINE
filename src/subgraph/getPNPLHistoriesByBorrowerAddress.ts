import { gql } from 'graphql-request'
import fault from '../utils/fault'
import getRequest, { Options } from './utils/getRequest'

type Params = {
  borrowerAddress: string
  timestamp?: number
}

export default async function getPNPLHistoriesByBorrowerAddress({ borrowerAddress, timestamp }: Params, { networkId, useCache }: Options = {}): Promise<any> {
  const request = getRequest(gql`
    query pnplhistories($borrowerAddress: String!${timestamp ? ', $timestamp: Int' : ''}) {
      pnplhistories(where: { borrower: $borrowerAddress${timestamp ? ', createAt_gte: $timestamp' : ''} }) {
        id
        borrowAmount
        borrower
        expireAtBlock
        loanDurationSeconds
        createAt
      }
    }
  `)

  return request({ borrowerAddress: borrowerAddress.toLowerCase(), timestamp }, { networkId, useCache })
    .then(res => res.pnplhistories)
    .catch(err => {
      throw fault('ERR_GQL_BAD_REQUEST', undefined, err)
    })
}
