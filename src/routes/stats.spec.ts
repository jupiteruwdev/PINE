import { expect } from 'chai'
import { describe, it } from 'mocha'
import request from 'supertest'
import app from '../app'

describe('routes/stats', () => {
  describe('GET /stats/global', () => {
    it('can get global stats', async () => {
      const { body: res } = await request(app).get('/stats/global')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res).to.have.property('capacity')
      expect(res).to.have.property('totalValueLentHistorical')
      expect(res).to.have.property('totalValueLocked')
      expect(res).to.have.property('utilizationRatio')
      expect(res).to.have.property('utilization')
    })
  })
})
