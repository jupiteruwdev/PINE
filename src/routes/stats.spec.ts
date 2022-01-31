import { expect } from 'chai'
import { describe, it } from 'mocha'
import request from 'supertest'
import app from '../'

describe('routes/stats', () => {
  it('can get global stats', async () => {
    const { body: res } = await request(app).get('/global-stats')
      .expect('Content-Type', /json/)
      .expect(200)

    expect(res).to.have.property('usd_capacity')
    expect(res).to.have.property('usd_tvl')
    expect(res).to.have.property('usd_current_utilization')
    expect(res).to.have.property('utilization_ratio')
    expect(res).to.have.property('usd_total_lent_historical')
    expect(res).to.have.property('block_number')
  })
})
