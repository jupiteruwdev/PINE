import { gql } from 'graphql-request'

export const GET_ACTIVE_LOANS_FOR_POOLS = gql`
  query loans($pools: [String]) {
    loans(where: {pool_in: $pools}) {
      id
      loanExpiretimestamp
      borrowedWei
      borrower
    }
  }
`

export const GET_POOL = gql`
  query pools($id: ID!) {
    pool(id: $id) {
      id
      totalUtilization
      collection
    }
  }
`

export const GET_OPEN_LOAN = gql`
  query loans($borrower: String, $id: ID) {
    loans(where: {borrower: $borrower, id: $id}) {
      erc721
      id
      pool
      borrowedWei
      returnedWei
      pool
      loanExpiretimestamp
    }
  }
`
