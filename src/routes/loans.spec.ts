import { expect } from 'chai'
import request from 'supertest'
import app from '../app'
import appConf from '../app.conf'

describe('routes /loans', () => {
  describe('GET /loans/nft', () => {
    it('Get loan by collection address and nft id for ethereum mainnet', async () => {
      const { body: res } = await request(app).get('/loans/nft')
        .query({
          collectionAddress: '0x3acce66cd37518a6d77d9ea3039e00b3a2955460',
          nftId: 6739,
          ethereum: 1,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res).to.have.property('routerAddress')
      expect(res).to.have.property('accuredInterest')
      expect(res).to.have.property('borrowed')
      expect(res).to.have.property('borrowerAddress')
      expect(res).to.have.property('expiresAt')
      expect(res).to.have.property('interestBPSPerBlock')
      expect(res).to.have.property('loanStartBlock')
      expect(res).to.have.property('maxLTVBPS')
      expect(res).to.have.property('nft')
      expect(res).to.have.property('outstanding')
      expect(res).to.have.property('poolAddress')
      expect(res).to.have.property('returned')
      expect(res).to.have.property('repaidInterest')
      expect(res).to.have.property('valuation')
      expect(res).to.have.property('updatedAtBlock')
    })
  })

  describe('GET /loans/borrower', () => {
    it('Get NFT loan with borrower for ethereum mainnet', async () => {
      const { body: res } = await request(app).get('/loans/borrower')
        .query({
          borrowerAddress: appConf.testingMainnetWallet,
          ethereum: 1,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.length).to.equal(2)

      for (const item of res) {
        expect(item).to.have.property('collection')
        expect(item).to.have.property('id')
        expect(item).to.have.property('isSupported')
        expect(item).to.have.property('imageUrl')
        expect(item).to.have.property('name')
        expect(item).to.have.property('loanExpireTimestamp')
      }
    })
  })

  describe('GET /loans/collection', () => {
    it('Get NFT loan with collection for ethereum mainnet', async () => {
      const { body: res } = await request(app).get('/loans/collection')
        .query({
          collectionAddress: '0x3acce66cd37518a6d77d9ea3039e00b3a2955460',
          ethereum: 1,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.length >= 0)

      if (res.length > 0) {
        for (const item of res) {
          expect(item).to.have.property('id')
          expect(item).to.have.property('thumbnail')
          expect(item).to.have.property('amountBorrowed')
          expect(item).to.have.property('expiry')
          expect(item).to.have.property('poolOwner')
        }
      }
    })
  })
})
