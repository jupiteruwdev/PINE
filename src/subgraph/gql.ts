import { gql } from 'graphql-request'

export const GET_ACTIVE_LOANS_FOR_POOLS = gql`
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
`

export const GET_LOAN = gql`
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
`
