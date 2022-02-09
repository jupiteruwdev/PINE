import { expect } from 'chai'
import { describe, it } from 'mocha'
import request from 'supertest'
import app from '../app'

describe('routes/stats', () => {
  it('can get global stats', async () => {
    const { body: res } = await request(app).get('/stats/global')
      .expect('Content-Type', /json/)
      .expect(200)

    expect(res).to.have.property('capacity')
    expect(res).to.have.property('total_lent_historical')
    expect(res).to.have.property('total_value_locked')
    expect(res).to.have.property('utilization_ratio')
    expect(res).to.have.property('utilization')
  })
})
