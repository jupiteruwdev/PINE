import { gql } from 'graphql-request'
import { LoanSortDirection, LoanSortType } from '../controllers/loans/searchLoans'
import fault from '../utils/fault'
import getRequest, { Options } from './utils/getRequest'

type Params = {
  lenderAddresses?: string[]
  collectionAddresses?: string[]
  poolAddresses?: string[]
  borrowerAddress?: string
  sortBy?: {
    type: LoanSortType
    direction: LoanSortDirection
  }
  paginateBy?: {
    count: number
    offset: number
  }
}

export default async function getOnChainLoans({
  lenderAddresses,
  collectionAddresses,
  poolAddresses,
  borrowerAddress,
  sortBy,
  paginateBy,
}: Params, options: Options): Promise<any[]> {
  const orderBy = sortBy !== undefined ? `orderBy: ${sortBy.type === LoanSortType.POOL_ADDRESS ? 'pool' : sortBy.type === LoanSortType.EXPIRES_AT ? 'loanExpiretimestamp' : sortBy.type === LoanSortType.BORROWED ? 'borrowedWei' : sortBy.type === LoanSortType.RETURNED ? 'returnedWei' : sortBy.type}, orderDirection: ${sortBy.direction}, ` : ''
  const pagination = paginateBy !== undefined ? `first: ${paginateBy.count}, skip: ${paginateBy.offset}, ` : ''
  const values = lenderAddresses?.length || collectionAddresses?.length || poolAddresses?.length || borrowerAddress?.length ? `(${lenderAddresses?.length ? '$lenders: [String]' : ''}${collectionAddresses?.length ? ',$collections: [String]' : ''}${poolAddresses?.length ? ',$pools: [String]' : ''}${borrowerAddress !== undefined ? ',$borrower: String' : ''})` : ''

  const request = getRequest(gql`
    query loans${values} {
      loans(
        ${orderBy}
        ${pagination}
        where: {
          status: "open"
          ${lenderAddresses?.length ? ',lenderAddress_in: $lenders' : ''}
          ${collectionAddresses?.length ? ',erc721_in: $collections' : ''}
          ${poolAddresses?.length ? ',pool_in: $pools' : ''}
          ${borrowerAddress !== undefined ? ',borrower: $borrower' : ''}
        }
      ) 
    {
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

  return request({
    lenders: lenderAddresses?.map(address => address.toLowerCase()),
    collections: collectionAddresses?.map(address => address.toLowerCase()),
    pools: poolAddresses?.map(address => address.toLowerCase()),
    borrower: borrowerAddress?.toLowerCase(),
  }, options)
    .then(res => res.loans)
    .catch(err => {
      throw fault('ERR_GQL_BAD_REQUEST', undefined, err)
    })
}
