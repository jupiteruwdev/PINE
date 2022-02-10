import { expect } from 'chai'
import _ from 'lodash'
import { describe, it } from 'mocha'
import request from 'supertest'
import app from '../app'
import { supportedCollections } from '../config/supportedCollecitons'

describe('routes/pools', () => {
  it('can get all Ethereum loan pools on Mainnet', async () => {
    const poolAddresses = _.map(supportedCollections, data => data.lendingPool.address)

    await Promise.all(poolAddresses.map(async poolAddress => {
      const { body: res } = await request(app).get(`/pools/eth/${poolAddress}`)
        .query({
          'networkId': 1,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res).to.have.property('address')
      expect(res).to.have.property('utilization')
      expect(res).to.have.property('valueLocked')
    }))
  })
})
