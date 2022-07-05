import { expect } from 'chai'
import _ from 'lodash'
import { describe, it } from 'mocha'
import request from 'supertest'
import app from '../app'
import { findAllCollections, findAllPools } from '../db'

describe('routes/pools', () => {
  describe('GET /pools/:poolAddress', () => {
    it('can get all Ethereum loan pools on Mainnet', async () => {
      const pools = await findAllPools()
      const poolAddresses = _.compact(_.flatMap(pools, data => (data.collection.blockchain.network === 'ethereum' && parseInt(data.collection.blockchain.networkId, 10) === 1) ? data.address : undefined))

      await Promise.all(poolAddresses.map(async poolAddress => {
        const { body: res } = await request(app).get(`/pools/${poolAddress}`)
          .query({
            ethereum: 1,
          })
          .expect('Content-Type', /json/)
          .expect(200)

        expect(res).to.have.property('address')
        expect(res).to.have.property('utilization')
        expect(res).to.have.property('valueLocked')
      }))
    })
  })

  describe('GET /pools/groups/collection', () => {
    it('can get all ethereum mainnet pools with collection address', async () => {
      const collections = await findAllCollections()
      const collectionAddresss = _.compact(_.flatMap(collections, data => data.blockchain.network === 'ethereum' && parseInt(data.blockchain.networkId, 10) === 1 ? data.address : undefined))

      await Promise.all(collectionAddresss.map(async collectionAddress => {
        const { body: res } = await request(app).get('/pools/groups/collection')
          .query({
            ethereum: 1,
            collectionAddress,
          })
          .expect('Content-Type', /json/)
          .expect(200)

        expect(res.length).to.equal(1)
        expect(res[0]).to.have.property('collection')
        expect(res[0]).to.have.property('floorPrice')
        expect(res[0]).to.have.property('pools')
        expect(res[0]).to.have.property('totalValueLent')
        expect(res[0]).to.have.property('totalValueLocked')
      }))
    })

    it('can get all ethereum rinkeby pools with collection address', async () => {
      const collections = await findAllCollections()
      const collectionAddresss = _.compact(_.flatMap(collections, data => data.blockchain.network === 'ethereum' && parseInt(data.blockchain.networkId, 10) === 4 ? data.address : undefined))

      await Promise.all(collectionAddresss.map(async collectionAddress => {
        const { body: res } = await request(app).get('/pools/groups/collection')
          .query({
            ethereum: 1,
            collectionAddress,
          })
          .expect('Content-Type', /json/)
          .expect(200)

        expect(res.length).to.equal(1)
        expect(res[0]).to.have.property('collection')
        expect(res[0]).to.have.property('floorPrice')
        expect(res[0]).to.have.property('pools')
        expect(res[0]).to.have.property('totalValueLent')
        expect(res[0]).to.have.property('totalValueLocked')
      }))
    })

    it('can get all solana mainnet pools with collection address', async () => {
      const collections = await findAllCollections()
      const collectionAddresss = _.compact(_.flatMap(collections, data => data.blockchain.network === 'solana' && data.blockchain.networkId === 'mainnet' ? data.address : undefined))

      await Promise.all(collectionAddresss.map(async collectionAddress => {
        const { body: res } = await request(app).get('/pools/groups/collection')
          .query({
            ethereum: 1,
            collectionAddress,
          })
          .expect('Content-Type', /json/)
          .expect(200)

        expect(res.length).to.equal(1)
        expect(res[0]).to.have.property('collection')
        expect(res[0]).to.have.property('floorPrice')
        expect(res[0]).to.have.property('pools')
        expect(res[0]).to.have.property('totalValueLent')
        expect(res[0]).to.have.property('totalValueLocked')
      }))
    })
  })

  describe('GET /pools/groups/search', () => {
    it('can get all ethereum mainnet pools with pagination', async () => {
      const collections = await findAllCollections()
      const collectionAddresss = _.compact(_.flatMap(collections, data => data.blockchain.network === 'ethereum' && parseInt(data.blockchain.networkId, 10) === 1 ? data.address : undefined))

      await Promise.all(collectionAddresss.map(async collectionAddress => {
        const { body: res } = await request(app).get('/pools/groups/search')
          .query({
            ethereum: 1,
            collectionAddress,
            offset: 0,
            count: 10,
          })
          .expect('Content-Type', /json/)
          .expect(200)

        expect(res.data.length).to.equal(1)
        console.log({ res })
        // expect(res.data.).to.equal(10)
        // console.log(res.data)
        // expect(res.length).to.equal(1)
        // expect(res[0]).to.have.property('collection')
        // expect(res[0]).to.have.property('floorPrice')
        // expect(res[0]).to.have.property('pools')
        // expect(res[0]).to.have.property('totalValueLent')
        // expect(res[0]).to.have.property('totalValueLocked')
      }))
    })
  })
})
