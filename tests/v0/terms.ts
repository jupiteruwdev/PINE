import { expect } from 'chai'
import request from 'supertest'
import app from '../../src/app'

describe('/v0/terms', () => {
  describe('Ethereum Mainnet', () => {
    it.skip('GET /v0/terms/borrow?collectionAddress=*nftId=*', async () => {
      const { body: res } = await request(app).get('/v0/terms/borrow?collectionAddress=0xca7ca7bcc765f77339be2d648ba53ce9c8a262bd&nftId=7355&ethereum=1')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res).to.have.property('routerAddress')
      expect(res).to.have.property('collection')
      expect(res).to.have.property('poolAddress')
      expect(res).to.have.property('expiresAtBlock')
      expect(res).to.have.property('issuedAtBlock')
      expect(res).to.have.property('nft')
      expect(res).to.have.property('options')
      expect(res).to.have.property('signature')
      expect(res).to.have.property('valuation')
    })

    it.skip('GET /v0/terms/rollover?collectionAddress=*nftId=*', async () => {
      const { body: res } = await request(app).get('/v0/terms/rollover?collectionAddress=0xca7ca7bcc765f77339be2d648ba53ce9c8a262bd&nftId=7355&ethereum=1')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res).to.have.property('routerAddress')
      expect(res).to.have.property('collection')
      expect(res).to.have.property('poolAddress')
      expect(res).to.have.property('expiresAtBlock')
      expect(res).to.have.property('issuedAtBlock')
      expect(res).to.have.property('nft')
      expect(res).to.have.property('options')
      expect(res).to.have.property('signature')
      expect(res).to.have.property('valuation')
      expect(res).to.have.property('flashLoanSourceContractAddress')
      expect(res).to.have.property('maxFlashLoanValue')
    })
  })
})
