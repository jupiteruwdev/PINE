import { request } from 'graphql-request'
import { GET_ACTIVE_LOANS_FOR_POOLS } from './gql'

export const getActiveLoansForPools = async ({
  pools,
}: {
  pools: string[]
}) =>
  request(process.env.SUBGRAPH_API_URL ?? '', GET_ACTIVE_LOANS_FOR_POOLS, {
    pools,
  })
