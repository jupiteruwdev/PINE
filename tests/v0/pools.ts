import { expect } from 'chai'
import _ from 'lodash'
import { describe, it } from 'mocha'
import request from 'supertest'
import app from '../../src/app'
import { searchPublishedPools } from '../../src/controllers'
import { getCollections } from '../../src/controllers/collections'
import { Blockchain } from '../../src/entities'

describe('routes/v0/pools', () => {
  describe('GET /pools/:poolAddress', () => {
    it('can get all ethereum loan pools on mainnet', async () => {
      const pools = await searchPublishedPools({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.MAIN } })

      await Promise.all(pools.map(async pool => {
        const { body: res } = await request(app).get(`/v0/pools/${pool.address}`)
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
      const collections = await getCollections()
      const collectionAddresses = _.compact(_.flatMap(collections, data => data.blockchain.network === 'ethereum' && parseInt(data.blockchain.networkId, 10) === 1 ? data.address : undefined))

      await Promise.all(collectionAddresses.map(async collectionAddress => {
        const { body: res } = await request(app).get('/v0/pools/groups/collection')
          .query({
            ethereum: 1,
            collectionAddress,
          })
          .expect('Content-Type', /json/)
          .expect(200)

        if (res.length) {
          expect(res.length).to.equal(1)
          expect(res[0]).to.have.property('collection')
          expect(res[0]).to.have.property('floorPrice')
          expect(res[0]).to.have.property('pools')
          expect(res[0]).to.have.property('totalValueLent')
          expect(res[0]).to.have.property('totalValueLocked')
        }
      }))
    })

    it('can get all ethereum rinkeby pools with collection address', async () => {
      const collections = await getCollections({
        blockchainFilter: {
          'ethereum': '0x4',
        },
      })
      const collectionAddresses = _.compact(_.flatMap(collections, data => data.blockchain.network === 'ethereum' && parseInt(data.blockchain.networkId, 10) === 4 ? data.address : undefined))

      await Promise.all(collectionAddresses.map(async collectionAddress => {
        const { body: res } = await request(app).get('/v0/pools/groups/collection')
          .query({
            ethereum: 4,
            collectionAddress,
          })
          .expect('Content-Type', /json/)
          .expect(200)
        if (res.length) {
          expect(res.length).to.equal(1)
          expect(res[0]).to.have.property('collection')
          expect(res[0]).to.have.property('floorPrice')
          expect(res[0]).to.have.property('pools')
          expect(res[0]).to.have.property('totalValueLent')
          expect(res[0]).to.have.property('totalValueLocked')
        }
      }))
    })

    it('can get all solana mainnet pools with collection address', async () => {
      const collections = await getCollections()
      const collectionAddresses = _.compact(_.flatMap(collections, data => data.blockchain.network === 'solana' && data.blockchain.networkId === 'mainnet' ? data.address : undefined))

      await Promise.all(collectionAddresses.map(async collectionAddress => {
        const { body: res } = await request(app).get('/v0/pools/groups/collection')
          .query({
            ethereum: 1,
            collectionAddress,
          })
          .expect('Content-Type', /json/)
          .expect(200)

        if (res.length) {
          expect(res.length).to.equal(1)
          expect(res[0]).to.have.property('collection')
          expect(res[0]).to.have.property('floorPrice')
          expect(res[0]).to.have.property('pools')
          expect(res[0]).to.have.property('totalValueLent')
          expect(res[0]).to.have.property('totalValueLocked')
        }
      }))
    })
  })

  describe('GET /pools/groups/search', () => {
    it('can get all ethereum mainnet pools with collection address & pagination', async () => {
      const collections = await getCollections()
      const collectionAddresses = _.compact(_.flatMap(collections, data => data.blockchain.network === 'ethereum' && parseInt(data.blockchain.networkId, 10) === 1 ? data.address : undefined))

      await Promise.all(collectionAddresses.map(async collectionAddress => {
        const { body: res } = await request(app).get('/v0/pools/groups/search')
          .query({
            ethereum: 1,
            collectionAddress,
            offset: 0,
            count: 10,
          })
          .expect('Content-Type', /json/)
          .expect(200)

        if (res.data.length) {
          expect(res.data.length).to.equal(1)
          expect(res.totalCount).to.equal(1)
          expect(res.nextOffset).to.equal(1)
          expect(res.data[0]).to.have.property('collection')
          expect(res.data[0]).to.have.property('totalValueLent')
          expect(res.data[0]).to.have.property('pools')
          expect(res.data[0]).to.have.property('floorPrice')
          expect(res.data[0]).to.have.property('totalValueLocked')
        }
      }))
    })

    it('can get all ethereum mainnet pools with pagination', async () => {
      const pools = await searchPublishedPools()
      const totalCount = pools.filter(pool => pool.collection.blockchain.network === 'ethereum' && parseInt(pool.collection.blockchain.networkId, 10) === 1).length
      const { body: res } = await request(app).get('/v0/pools/groups/search')
        .query({
          ethereum: 1,
          offset: 0,
          count: 10,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      if (res.data.length) {
        expect(res.data.length).to.equal(10)
        expect(res.totalCount).to.equal(totalCount)
        expect(res.nextOffset).to.equal(10)
        expect(res.data[0]).to.have.property('collection')
        expect(res.data[0]).to.have.property('totalValueLent')
        expect(res.data[0]).to.have.property('pools')
        expect(res.data[0]).to.have.property('floorPrice')
        expect(res.data[0]).to.have.property('totalValueLocked')
      }
    })

    it('can get all ethereum mainnet pools with collection name & pagination', async () => {
      const { body: res } = await request(app).get('/v0/pools/groups/search')
        .query({
          ethereum: 1,
          query: 'Meebits',
          offset: 0,
          count: 10,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      if (res.data.length) {
        expect(res.data.length).to.equal(1)
        expect(res.totalCount).to.equal(1)
        expect(res.nextOffset).to.equal(1)
        expect(res.data[0]).to.have.property('collection')
        expect(res.data[0]).to.have.property('totalValueLent')
        expect(res.data[0]).to.have.property('pools')
        expect(res.data[0]).to.have.property('floorPrice')
        expect(res.data[0]).to.have.property('totalValueLocked')
      }
    })

    it('can get all ethereum mainnet pools with sorting & pagination', async () => {
      const pools = await searchPublishedPools()
      const totalCount = pools.filter(pool => pool.collection.blockchain.network === 'ethereum' && parseInt(pool.collection.blockchain.networkId, 10) === 1).length
      const { body: res } = await request(app).get('/v0/pools/groups/search')
        .query({
          ethereum: 1,
          sort: 'name',
          direction: 'desc',
          offset: 0,
          count: 10,
        })
        .expect('Content-Type', /json/)
        .expect(200)
      if (res.data.length) {
        expect(res.data.length).to.equal(10)
        expect(res.totalCount).to.equal(totalCount)
        expect(res.nextOffset).to.equal(10)
        expect(res.data[0]).to.have.property('collection')
        expect(res.data[0]).to.have.property('totalValueLent')
        expect(res.data[0]).to.have.property('pools')
        expect(res.data[0]).to.have.property('floorPrice')
        expect(res.data[0]).to.have.property('totalValueLocked')
      }
    })
  })
})
