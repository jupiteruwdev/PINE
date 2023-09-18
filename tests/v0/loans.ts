import { expect } from 'chai'
import request from 'supertest'
import app from '../../src/app'
import appConf from '../../src/app.conf'
import { Loan } from '../../src/entities'

describe('GET /v0/loans', () => {
  describe('Ethereum Mainnet', () => {
    it.skip('GET /v0/loans/nft?collectionAddress=*&nftId=*', async () => {
      const { body: res } = await request(app).get('/v0/loans/nft')
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

    it.skip('GET /v0/loans/borrower', async () => {
      const { body: res } = await request(app).get('/v0/loans/borrower')
        .query({
          borrowerAddress: appConf.tests.walletAddress,
          ethereum: 1,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.length).to.equal(1)

      const codingResolver = Loan.codingResolver

      for (const item of res) {
        for (const k of Object.keys(codingResolver)) {
          if (codingResolver[k as keyof typeof codingResolver].options.optional === true) continue
          expect(item).to.have.property(k)
        }
      }
    })

    it('GET /v0/loans/collection?collectionAddress=*', async () => {
      const { body: res } = await request(app).get('/v0/loans/collection')
        .query({
          collectionAddress: '0x3acce66cd37518a6d77d9ea3039e00b3a2955460',
          ethereum: 1,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.length >= 0)

      if (res.length > 0) {
        for (const item of res) {
          expect(item).to.have.property('borrowed')
          expect(item).to.have.property('expiresAt')
          expect(item).to.have.property('nft')
          expect(item).to.have.property('accuredInterest')
          expect(item).to.have.property('borrowerAddress')
          expect(item).to.have.property('returned')
          expect(item).to.have.property('repaidInterest')
          expect(item).to.have.property('maxLTVBPS')
          expect(item).to.have.property('poolAddress')
          expect(item).to.have.property('loanStartBlock')
          expect(item).to.have.property('interestBPSPerBlock')
        }
      }
    })
  })
})
