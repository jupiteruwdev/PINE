import { expect } from 'chai'
import request from 'supertest'
import app from '../../src/app'

describe('/v0/terms', () => {
  describe('Ethereum Mainnet', () => {
    it('GET /v0/terms/borrow?collectionAddress=*nftId=*', async () => {
      const { body: res } = await request(app).get('/v0/terms/borrow?collectionAddresses[]=0x3acce66cd37518a6d77d9ea3039e00b3a2955460&nftIds[]=6739&ethereum=1')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.length).to.gt(0)

      for (const terms of res) {
        expect(terms).to.have.property('routerAddress')
        expect(terms).to.have.property('collection')
        expect(terms).to.have.property('poolAddress')
        expect(terms).to.have.property('expiresAtBlock')
        expect(terms).to.have.property('issuedAtBlock')
        expect(terms).to.have.property('nft')
        expect(terms).to.have.property('options')
        expect(terms).to.have.property('signature')
        expect(terms).to.have.property('valuation')
      }
    })

    it('GET /v0/terms/rollover?collectionAddress=*nftId=*', async () => {
      const { body: res } = await request(app).get('/v0/terms/rollover?collectionAddresses[]=0x3acce66cd37518a6d77d9ea3039e00b3a2955460&nftIds[]=6739&ethereum=1')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.length).to.gt(0)
      for (const terms of res) {
        expect(terms).to.have.property('routerAddress')
        expect(terms).to.have.property('collection')
        expect(terms).to.have.property('poolAddress')
        expect(terms).to.have.property('expiresAtBlock')
        expect(terms).to.have.property('issuedAtBlock')
        expect(terms).to.have.property('nft')
        expect(terms).to.have.property('options')
        expect(terms).to.have.property('signature')
        expect(terms).to.have.property('valuation')
        expect(terms).to.have.property('flashLoanSourceContractAddress')
        expect(terms).to.have.property('maxFlashLoanValue')
      }
    })
  })
})
