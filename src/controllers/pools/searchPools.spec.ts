/**
 * @todo Test all available params of {@link searchPools}.
 */

import { expect } from 'chai'
import { initDb } from '../../db'
import { Pool } from '../../entities'
import searchPools, { PoolSortDirection, PoolSortType } from './searchPools'

describe('controllers/pools/searchPools', () => {
  before('connect to db', async () => {
    await initDb()
  })

  it('can search all pools with default params', async () => {
    const pools = await searchPools()

    assertPoolArray(pools)
  })

  it('can search pools with pagination options', async () => {
    const pools = await searchPools({ paginateBy: { count: 5, offset: 0 } })

    expect(pools).to.have.length(5)
    assertPoolArray(pools)
  })

  it('can search pools with sort options', async () => {
    const pools = await searchPools({ sortBy: { type: PoolSortType.NAME, direction: PoolSortDirection.ASC } })

    expect(pools).to.have.length.greaterThan(0)
    assertPoolArray(pools)
  })
})

function assertPoolArray(pools: any[]) {
  const codingResolver = Pool.codingResolver

  for (const pool of pools) {
    for (const k of Object.keys(codingResolver)) {
      if (codingResolver[k as keyof typeof codingResolver].options.optional === true) continue
      expect(pool).to.have.property(k)
    }
  }
}
