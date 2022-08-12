import { expect } from 'chai'
import { describe, it } from 'mocha'
import request from 'supertest'
import app from '../../src/app'

describe('/v0/stats', () => {
  it('GET /v0/stats/global', async () => {
    const { body: res } = await request(app).get('/v0/stats/global')
      .expect('Content-Type', /json/)
      .expect(200)

    expect(res).to.have.property('capacity')
    expect(res).to.have.property('totalValueLentHistorical')
    expect(res).to.have.property('totalValueLocked')
    expect(res).to.have.property('utilizationRatio')
    expect(res).to.have.property('utilization')
  })
})
