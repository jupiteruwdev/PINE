import { expect } from 'chai'
import _ from 'lodash'
import request from 'supertest'
import app from '../app'
import { findAllCollections } from '../db'

describe('routes/valuations', () => {
  describe('GET /valuations', () => {
    it('can get floor prices for ethereum mainnet colletion addresses', async () => {
      const collections = await findAllCollections()
      const collectionAddresses = _.compact(_.flatMap(collections, data => data.blockchain.network === 'ethereum' && parseInt(data.blockchain.networkId, 10) === 1 ? data.address : undefined)).slice(0, 10)

      const { body: res } = await request(app).get('/valuations')
        .query({
          ethereum: 1,
          collectionAddresses,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.length).to.equal(10)
      _.forEach(res, (item, index: number) => {
        expect(item).to.have.property('collection')
        expect(item).to.have.property('value1DReference')
        expect(collectionAddresses.findIndex(address => address.toLowerCase() === item.collection.address.toLowerCase())).to.gte(0)
      })
    })

    it('can get floor prices for ethereum rinkeby colletion addresses', async () => {
      const collections = await findAllCollections({ blockchainFilter: {
        'ethereum': '0x4',
      } })
      const collectionAddresses = _.compact(_.flatMap(collections, data => data.blockchain.network === 'ethereum' && parseInt(data.blockchain.networkId, 10) === 4 ? data.address : undefined))

      const { body: res } = await request(app).get('/valuations')
        .query({
          ethereum: '0x4',
          collectionAddresses,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.length).to.equal(3)
      _.forEach(res, (item, index: number) => {
        expect(item).to.have.property('collection')
        expect(item).to.have.property('value1DReference')
        expect(collectionAddresses.findIndex(address => address.toLowerCase() === item.collection.address.toLowerCase())).to.gte(0)
      })
    })
  })
})
