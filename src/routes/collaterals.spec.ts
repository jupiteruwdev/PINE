import { expect } from 'chai'
import request from 'supertest'
import app from '../app'
import appConf from '../app.conf'

describe('routes /collaterals', () => {
  describe('GET /collaterals', () => {
    it('can get all Ethereum mainnet collaterals', async () => {
      const { body: res } = await request(app).get('/collaterals')
        .query({
          ethereum: 1,
          owner: appConf.tests.walletAddress,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.length).to.equal(4)
      for (const item of res) {
        expect(item).to.have.property('collection')
        expect(item).to.have.property('id')
        expect(item).to.have.property('isSupported')
        expect(item).to.have.property('ownerAddress')
        expect(item).to.have.property('imageUrl')
        expect(item).to.have.property('name')
      }
    })

    it('can get all Ethereum rinkeby collaterals', async () => {
      const { body: res } = await request(app).get('/collaterals')
        .query({
          ethereum: 4,
          owner: appConf.tests.walletAddress,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.length).to.equal(2)
      for (const item of res) {
        expect(item).to.have.property('collection')
        expect(item).to.have.property('id')
        expect(item).to.have.property('isSupported')
        expect(item).to.have.property('ownerAddress')
        expect(item).to.have.property('imageUrl')
        expect(item).to.have.property('name')
      }
    })
  })
})
