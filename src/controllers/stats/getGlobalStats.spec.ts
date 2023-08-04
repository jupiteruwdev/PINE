import { expect } from 'chai'
import { initDb } from '../../database'
import { Blockchain, GlobalStats } from '../../entities'
import getGlobalStats from './getGlobalStats'

describe('controllers/stats/getGlobalStats', () => {
  before('connect to db', async () => {
    await initDb()
  })

  it('can fetch global stats', async () => {
    const stats = await getGlobalStats({
      blockchainFilter: {
        ethereum: Blockchain.Ethereum.Network.MAIN,
      },
    })
    const codingResolver = GlobalStats.codingResolver

    for (const k of Object.keys(codingResolver)) {
      if (codingResolver[k as keyof typeof codingResolver].options.optional === true) continue
      expect(stats).to.have.property(k)
    }
  })
})
