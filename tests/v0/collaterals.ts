import { expect } from 'chai'
import request from 'supertest'
import app from '../../src/app'
import appConf from '../../src/app.conf'
import { deserializeEntityArray, NFT } from '../../src/entities'

describe('routes/v0/collaterals', () => {
  describe('GET /collaterals', () => {
    it('can get all Ethereum Mainnet collaterals', async () => {
      const { body: res } = await request(app).get('/v0/collaterals')
        .query({
          ethereum: 1,
          owner: appConf.tests.walletAddress,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      const nfts = deserializeEntityArray(res, NFT.codingResolver)

      expect(nfts.length).to.be.greaterThanOrEqual(1)

      for (const nft of nfts) {
        expect(nft).to.have.property('collection')
        expect(nft).to.have.property('id')
        expect(nft).to.have.property('ownerAddress')
        expect(nft).to.have.property('imageUrl')
        expect(nft).to.have.property('name')
      }
    })

    it('can get all Ethereum Rinkeby collaterals', async () => {
      const { body: res } = await request(app).get('/v0/collaterals')
        .query({
          ethereum: 4,
          owner: appConf.tests.walletAddress,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      const nfts = deserializeEntityArray(res, NFT.codingResolver)

      expect(nfts.length).to.be.greaterThanOrEqual(1)

      for (const nft of nfts) {
        expect(nft).to.have.property('collection')
        expect(nft).to.have.property('id')
        expect(nft).to.have.property('ownerAddress')
        expect(nft).to.have.property('imageUrl')
        expect(nft).to.have.property('name')
      }
    })
  })
})
