import { expect } from 'chai'
import _ from 'lodash'
import { describe, it } from 'mocha'
import request from 'supertest'
import app from '../app'
import { supportedCollections } from '../config/supportedCollections'

describe('routes/pools', () => {
  it('can get all Ethereum loan pools on Mainnet', async () => {
    const poolAddresses = _.compact(_.flatMap(supportedCollections, data => (data.networkType === 'ethereum' && data.networkId === 1) ? data.lendingPools.map((lendingPool: any) => lendingPool.address) : undefined))

    await Promise.all(poolAddresses.map(async poolAddress => {
      console.log(poolAddress)
      const { body: res } = await request(app).get(`/pools/eth/${poolAddress}`)
        .query({
          ethereum: 1,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res).to.have.property('address')
      expect(res).to.have.property('utilization')
      expect(res).to.have.property('valueLocked')
    }))
  })
})
