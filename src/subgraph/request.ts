import { request } from 'graphql-request'
import { GET_ACTIVE_LOANS_FOR_POOLS, GET_POOL } from './gql'

export const getActiveLoansForPools = async ({
  pools,
}: {
  pools: string[]
}) =>
  request(process.env.SUBGRAPH_API_URL ?? '', GET_ACTIVE_LOANS_FOR_POOLS, {
    pools,
  })

export const getPool = async (
  pool: string
) =>
  request(process.env.SUBGRAPH_API_URL ?? '', GET_POOL, {
    id: pool,
  })
