import { expect } from 'chai'
import _ from 'lodash'
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
      nfts.every(nft => expect(nft).to.have.all.keys(...Object.keys(NFT.codingResolver)))
      nfts.every(nft => [...Object.keys(_.omitBy(NFT.codingResolver, coder => coder.options.optional === true)), 'ownerAddress'].every(key => expect(_.get(nft, key)).to.not.be.undefined))
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
      nfts.every(nft => expect(nft).to.have.all.keys(...Object.keys(NFT.codingResolver)))
      nfts.every(nft => [...Object.keys(_.omitBy(NFT.codingResolver, coder => coder.options.optional === true)), 'ownerAddress'].every(key => expect(_.get(nft, key)).to.not.be.undefined))
    })
  })
})
