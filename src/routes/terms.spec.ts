import { expect } from 'chai'
import request from 'supertest'
import app from '../app'

describe('routes /terms', () => {
  describe('GET /terms/borrow', () => {
    it('Can get borrow term with collection address and nft id for ethereum mainnet', async () => {
      const { body: res } = await request(app).get('/terms/borrow')
        .query({
          collectionAddress: '0x3acce66cd37518a6d77d9ea3039e00b3a2955460',
          nftId: 6739,
          ethereum: 1,
        })
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
  })

  describe('GET /terms/rollover', () => {
    it('Can get rollover term with collection address and nft id for ethereum mainnet', async () => {
      const { body: res } = await request(app).get('/terms/rollover')
        .query({
          collectionAddress: '0x3acce66cd37518a6d77d9ea3039e00b3a2955460',
          nftId: 6739,
          ethereum: 1,
        })
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
