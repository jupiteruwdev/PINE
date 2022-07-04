import { expect } from 'chai'
import _ from 'lodash'
import { describe, it } from 'mocha'
import request from 'supertest'
import app from '../app'
import { findAllPools } from '../db'

describe('routes/pools', () => {
  describe('GET /pools/:poolAddress', () => {
    it('can get all Ethereum loan pools on Mainnet', async () => {
      const pools = await findAllPools()
      const poolAddresses = _.compact(_.flatMap(pools, data => (data.collection.blockchain.network === 'ethereum' && parseInt(data.collection.blockchain.networkId, 10) === 1) ? data.address : undefined))

      await Promise.all(poolAddresses.map(async poolAddress => {
        const { body: res } = await request(app).get(`/pools/${poolAddress}`)
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
})
