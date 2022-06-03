import { request } from 'graphql-request'
import appConf from '../app.conf'
import { GET_ACTIVE_LOANS_FOR_POOLS, GET_POOL } from './gql'

export const getActiveLoansForPools = async ({
  pools,
}: {
  pools: string[]
}) =>
  request(appConf.subgraphAPIUrl ?? '', GET_ACTIVE_LOANS_FOR_POOLS, {
    pools,
  })

export const getPool = async (
  pool: string
) =>
  request(appConf.subgraphAPIUrl ?? '', GET_POOL, {
    id: pool,
  })
