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
          owner: appConf.testingMainnetWallet,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.length).to.equal(4)
      for (let i = 0; i < 4; i += 1) {
        expect(res[i]).to.have.property('collection')
        expect(res[i]).to.have.property('id')
        expect(res[i]).to.have.property('isSupported')
        expect(res[i]).to.have.property('ownerAddress')
        expect(res[i]).to.have.property('imageUrl')
        expect(res[i]).to.have.property('name')
      }
    })

    it('can get all Ethereum rinkeby collaterals', async () => {
      const { body: res } = await request(app).get('/collaterals')
        .query({
          ethereum: 4,
          owner: appConf.testingMainnetWallet,
        })
        .expect('Content-Type', /json/)
        .expect(200)
      console.log(res)

      expect(res.length).to.equal(2)
      for (let i = 0; i < 2; i += 1) {
        expect(res[i]).to.have.property('collection')
        expect(res[i]).to.have.property('id')
        expect(res[i]).to.have.property('isSupported')
        expect(res[i]).to.have.property('ownerAddress')
        expect(res[i]).to.have.property('imageUrl')
        expect(res[i]).to.have.property('name')
      }
    })
  })
})
