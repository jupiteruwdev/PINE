import { expect } from 'chai'
import { describe, it } from 'mocha'
import request from 'supertest'
import app from '../../src/app'
import { searchPublishedPools } from '../../src/controllers'
import { getCollections } from '../../src/controllers/collections'
<<<<<<< HEAD
import { Blockchain, Collection, deserializeEntity, Pool, PoolGroup } from '../../src/entities'
=======
import { PoolModel } from '../../src/db'
import { Blockchain, Pool } from '../../src/entities'
>>>>>>> staging

describe('routes/v0/pools', () => {
  afterEach(function() {
    if (this.currentTest?.state !== 'failed') return
    console.error(this.currentTest?.err)
  })

  describe('Ethereum Mainnet', () => {
    let pools: Pool[] = []
    let collections: Collection[] = []

    before(async () => {
      pools = await searchPublishedPools({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.MAIN } })
      collections = await getCollections({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.MAIN} })
    })

    describe('GET /pools/:poolAddress', () => {
      it('can get each published pool', async () => {
        await Promise.all(pools.map(async pool => {
          const { body: res } = await request(app).get(`/v0/pools/${pool.address}`)
            .query({
              ethereum: Blockchain.Ethereum.Network.MAIN,
            })
            .expect('Content-Type', /json/)
            .expect(200)

          const poolGroups = deserializeEntity(res, Pool.codingResolver)

          expect(poolGroups).to.have.all.keys(...Object.keys(Pool.codingResolver))
        }))
      })
    })

    describe('GET /pools/groups/search', () => {
      it('can search pool groups with pagination', async () => {
        const { body: res } = await request(app).get('/v0/pools/groups/search')
          .query({
            ethereum: Blockchain.Ethereum.Network.MAIN,
            offset: 0,
            count: 10,
          })
          .expect('Content-Type', /json/)
          .expect(200)

        expect(res.data).be.an('array')
        expect(res.data).to.have.length(10)
        expect(res.totalCount).to.equal(pools.length)
        expect(res.nextOffset).to.equal(10)
        res.data.every((poolGroup: any) => expect(poolGroup).to.have.keys(...Object.keys(PoolGroup.codingResolver)))
      })

      it('can search each pool group by collection address with pagination', async () => {
        await Promise.all(collections.map(async collection => {
          const { body: res } = await request(app).get('/v0/pools/groups/search')
            .query({
              ethereum: Blockchain.Ethereum.Network.MAIN,
              collectionAddress: collection.address,
              offset: 0,
              count: 10,
            })
            .expect('Content-Type', /json/)
            .expect(200)

          expect(res.data).be.an('array')
          expect(res.data.length).to.be.oneOf([0, 1])

          if (res.data.length === 1) {
            expect(res.totalCount).to.equal(1)
            expect(res.nextOffset).to.equal(1)
            res.data.every((poolGroup: any) => expect(poolGroup).to.have.keys(...Object.keys(PoolGroup.codingResolver)))
          }
        }))
      })

      it('can search a pool group by colleciton name with pagination', async () => {
        const { body: res } = await request(app).get('/v0/pools/groups/search')
          .query({
            ethereum: Blockchain.Ethereum.Network.MAIN,
            query: 'Meebits',
            offset: 0,
            count: 10,
          })
          .expect('Content-Type', /json/)
          .expect(200)

        expect(res.data).be.an('array')
        expect(res.data.length).to.be.oneOf([0, 1])

        if (res.data.length === 1) {
          expect(res.totalCount).to.equal(1)
          expect(res.nextOffset).to.equal(1)
          res.data.every((poolGroup: any) => expect(poolGroup).to.have.keys(...Object.keys(PoolGroup.codingResolver)))
        }
      })

      it('can search pool groups with sorting and pagination', async () => {
        const { body: res } = await request(app).get('/v0/pools/groups/search')
          .query({
            ethereum: Blockchain.Ethereum.Network.MAIN,
            sort: 'name',
            direction: 'desc',
            offset: 0,
            count: 10,
          })
          .expect('Content-Type', /json/)
          .expect(200)

        expect(res.data).be.an('array')
        expect(res.data).to.have.length(10)

        if (res.data.length === 1) {
          expect(res.totalCount).to.equal(pools.length)
          expect(res.nextOffset).to.equal(10)
          res.data.every((poolGroup: any) => expect(poolGroup).to.have.keys(...Object.keys(PoolGroup.codingResolver)))
        }
      })
    })

    describe('GET /pools/groups/collection', () => {
      it('can get each pool group by collection address', async () => {
        await Promise.all(collections.map(async collection => {
          const { body: res } = await request(app).get('/v0/pools/groups/collection')
            .query({
              ethereum: Blockchain.Ethereum.Network.MAIN,
              collectionAddress: collection.address,
            })
            .expect('Content-Type', /json/)
            .expect(200)

          expect(res).be.an('array')
          expect(res.length).to.be.oneOf([0, 1])

          if (res.length === 1) {
            res.every((poolGroup: any) => expect(poolGroup).to.have.keys(...Object.keys(PoolGroup.codingResolver)))
          }
        }))
      })
    })
  })

  describe('Ethereum Rinkeby', () => {
    let collections: Collection[] = []

    before(async () => {
      collections = await getCollections({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.MAIN} })
    })

    describe('GET /pools/groups/collection', () => {
      it('can get each pool group by collection address', async () => {
        await Promise.all(collections.map(async collection => {
          const { body: res } = await request(app).get('/v0/pools/groups/collection')
            .query({
              ethereum: Blockchain.Ethereum.Network.RINKEBY,
              collectionAddress: collection.address,
            })
            .expect('Content-Type', /json/)
            .expect(200)

          expect(res).be.an('array')
          expect(res.length).to.be.oneOf([0, 1])

          if (res.length === 1) {
            res.every((poolGroup: any) => expect(poolGroup).to.have.keys(...Object.keys(PoolGroup.codingResolver)))
          }
        }))
      })
    })
  })

  describe('GET /pools/lender', () => {
    it('can get ethereum published & unpublished pools by lender', async () => {
      const { body: res } = await request(app).get('/v0/pools/lender')
        .query({
          ethereum: 1,
          lenderAddress: '0xfb9684ec1026513241f777485911043dc2aa9a4f',
        })
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.length).to.gte(0)
      for (const item of res) {
        const pool = Pool.factory(item)
        for (const key in pool) {
          if (Object.prototype.hasOwnProperty.call(pool, key)) {
            expect(item).to.have.property(key)
          }
        }
      }
    })
  })

  describe('POST /pools/:poolAddress', () => {
    it('can publish ethereum pool', async () => {
      const { body: res } = await request(app).post('/v0/pools/0xc59d88285ab60abbf44ed551d554e86d4ab34442')
        .query({
          ethereum: 1,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      const pool = Pool.factory(res)
      for (const key in pool) {
        if (Object.prototype.hasOwnProperty.call(pool, key)) {
          expect(res).to.have.property(key)
        }
      }

      await PoolModel.deleteOne({
        address: '0xc59d88285ab60abbf44ed551d554e86d4ab34442',
      }).exec()
    })
  })
})
