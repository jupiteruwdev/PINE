import { expect } from 'chai'
import { initDb } from '../../db'
import { GlobalStats } from '../../entities'
import getGlobalStats from './getGlobalStats'

describe('controllers/stats/getGlobalStats', () => {
  before('connect to db', async () => {
    await initDb()
  })

  it('can fetch global stats', async () => {
    const stats = await getGlobalStats()
    const codingResolver = GlobalStats.codingResolver

    for (const k of Object.keys(codingResolver)) {
      if (codingResolver[k as keyof typeof codingResolver].options.optional === true) continue
      expect(stats).to.have.property(k)
    }
  })
})
