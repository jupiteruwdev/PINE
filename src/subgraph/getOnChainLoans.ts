import { gql } from 'graphql-request'
import { LoanSortDirection, LoanSortType } from '../controllers/loans/searchLoans'
import fault from '../utils/fault'
import getRequest, { Options } from './utils/getRequest'

type Params = {
  lenderAddresses?: string[]
  collectionAddresses?: string[]
  sortBy?: {
    type: LoanSortType
    direction: LoanSortDirection
  }
  paginateBy?: {
    count: number
    offset: number
  }
}

export default async function getOnChainLoans({ lenderAddresses, collectionAddresses, sortBy, paginateBy }: Params, options: Options): Promise<any[]> {
  const orderBy = sortBy !== undefined ? `orderBy: ${sortBy.type === LoanSortType.POOL_ADDRESS ? 'pool' : sortBy.type}, orderDirection: ${sortBy.direction}, ` : ''
  const pagination = paginateBy !== undefined ? `first: ${paginateBy.count}, skip: ${paginateBy.offset}, ` : ''
  const request = getRequest(gql`
    query loans(${lenderAddresses?.length ? '$lenders: [String],' : ''}${collectionAddresses?.length ? '$collections: [String]' : ''}) {
      loans(${orderBy}${pagination}where: {status: "open", ${lenderAddresses?.length ? 'lenderAddress_in: $lenders, ' : ''}${collectionAddresses?.length ? 'erc721_in: $collections' : ''}}) {
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
        lenderAddress
        pool
        erc721
        status
      }
    }
  `)

  return request({ lenders: lenderAddresses, collections: collectionAddresses }, options)
    .then(res => res.loans)
    .catch(err => {
      throw fault('ERR_GQL_BAD_REQUEST', undefined, err)
    })
}
