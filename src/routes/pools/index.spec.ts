import { expect } from 'chai'
import { describe, it } from 'mocha'
import request from 'supertest'
import app from '../../app'
import appConf from '../../app.conf'

describe('routes/pools', () => {
  it('can get all Ethereum loan pools on Mainnet', async () => {
    await Promise.all(appConf.v1Pools.map(async poolAddress => {
      const { body: res } = await request(app).get(`/pools/eth/${poolAddress}`)
        .query({
          'network_id': 1,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res).to.have.property('address')
      expect(res).to.have.property('currency')
      expect(res).to.have.property('value_lent')
      expect(res).to.have.property('value_locked')
    }))
  })
})
