import { expect } from 'chai'
import { describe, it } from 'mocha'
import request from 'supertest'
import app from '../'
import appConf from '../app.conf'

describe('routes/balances', () => {
  it('can get ETH balances on Mainnet', async () => {
    const poolAddress = appConf.v1pools

    const { body: res } = await request(app).get('/balances/eth')
      .query({
        'network_id': 1,
        'pool_address': poolAddress[0],
      })
      .expect('Content-Type', /json/)
      .expect(200)

    expect(res).to.have.property('eth_tvl')
    expect(res).to.have.property('eth_capacity')
    expect(res).to.have.property('eth_current_utilization')
    expect(res).to.have.property('utilization_ratio')
    expect(res).to.have.property('block_number')
  })
})
