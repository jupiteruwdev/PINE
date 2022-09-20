/**
 * @todo Test all available params of {@link searchPublishedPools}.
 */

import { expect } from 'chai'
import { initDb } from '../../db'
import { Blockchain, Pool } from '../../entities'
import searchPublishedPools, { PoolSortDirection, PoolSortType } from './searchPublishedPools'

describe('controllers/pools/searchPublishedPools', () => {
  before('connect to db', async () => {
    await initDb()
  })

  it('can search all pools with default params', async () => {
    const pools = await searchPublishedPools()

    assertPoolArray(pools)
  })

  it('can search all pools on Ethereum Mainnet', async () => {
    const pools = await searchPublishedPools({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.MAIN } })

    assertPoolArray(pools)
  })

  it('can search all pools on Ethereum Rinkeby', async () => {
    const pools = await searchPublishedPools({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.RINKEBY } })

    assertPoolArray(pools)
  })

  it('can search pools with pagination options', async () => {
    const pools = await searchPublishedPools({ paginateBy: { count: 5, offset: 0 } })

    expect(pools).to.have.length(5)
    assertPoolArray(pools)
  })

  it('can search pools with sort options', async () => {
    const pools = await searchPublishedPools({ sortBy: { type: PoolSortType.NAME, direction: PoolSortDirection.ASC } })

    expect(pools).to.have.length.greaterThan(0)
    assertPoolArray(pools)
  })

  // TODO: Pool is retired?
  it.skip('can search pools with pool address', async () => {
    const pools = await searchPublishedPools({ address: '0x609fee5870739611fea720ad5d86be458b47596a' })

    expect(pools).to.have.length(1)
    expect(pools[0].address).equals('0x609fee5870739611fea720ad5d86be458b47596a')
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
