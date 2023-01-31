import { expect } from 'chai'
import _ from 'lodash'
import { describe, it } from 'mocha'
import request from 'supertest'
import app from '../../src/app'
import appConf from '../../src/app.conf'
import { countPoolGroups, getCollections, searchPublishedPools } from '../../src/controllers'
import getEthWeb3 from '../../src/controllers/utils/getEthWeb3'
import { Blockchain, Collection, deserializeEntity, Pool, PoolGroup } from '../../src/entities'

describe('/v0/pools', () => {
  describe('Ethereum Mainnet', () => {
    let pools: Pool[] = []
    let collections: Collection[] = []

    before(async () => {
      pools = await searchPublishedPools({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.MAIN } }) as Pool[]
      collections = await getCollections({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.MAIN } })
    })

    it('GET /v0/pools/:poolAddress', async () => {
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

    it('GET /v0/pools/lender?lenderAddress=*', async () => {
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
          if (Object.prototype.hasOwnProperty.call(pool, key) && _.get(pool, key)) {
            expect(item).to.have.property(key)
          }
        }
      }
    })

    it('GET /v0/pools/groups/search?offset=*&count=*', async () => {
      const expectedPoolGroupsLength = await countPoolGroups({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.MAIN }, includeRetired: false })
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
      expect(res.totalCount).to.equal(expectedPoolGroupsLength)
      expect(res.nextOffset).to.equal(10)
      res.data.every((poolGroup: any) => expect(poolGroup).to.have.keys(...Object.keys(PoolGroup.codingResolver)))
    })

    it('GET /v0/pools/groups/search?collectionAddress=*&offset=*&count=*', async () => {
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

        if (res.data.length === 1) {
          expect(res.totalCount).to.equal(1)
          expect(res.nextOffset).to.equal(undefined)
          res.data.every((poolGroup: any) => expect(poolGroup).to.have.keys(...Object.keys(PoolGroup.codingResolver)))
        }
      }))
    })

    it('GET /v0/pools/groups/search?query=*&offset=*&count=*', async () => {
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

      if (res.data.length === 1) {
        expect(res.totalCount).to.equal(1)
        expect(res.nextOffset).to.equal(undefined)
        res.data.every((poolGroup: any) => expect(poolGroup).to.have.keys(...Object.keys(PoolGroup.codingResolver)))
      }
    })

    it('GET /v0/pools/groups/search?sort=*&direction=*&offset=*&count=*', async () => {
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

    it('GET /v0/pools/groups/collection?collectionAddress=*', async () => {
      await Promise.all(collections.map(async collection => {
        const { body: res } = await request(app).get('/v0/pools/groups/collection')
          .query({
            ethereum: Blockchain.Ethereum.Network.MAIN,
            collectionAddress: collection.address,
          })
          .expect('Content-Type', /json/)
          .expect(200)

        expect(res).be.an('array')
        res.every((poolGroup: any) => expect(poolGroup).to.have.keys(...Object.keys(PoolGroup.codingResolver)))
      }))
    })

    it('POST /v0/pools', async () => {
      const payload = JSON.stringify({
        poolAddress: '0xc59d88285ab60abbf44ed551d554e86d4ab34442',
      })
      const web3 = getEthWeb3(Blockchain.Ethereum.Network.MAIN)
      const wallet = web3.eth.accounts.privateKeyToAccount(appConf.tests.privateKey)
      const tx = wallet.sign(payload)
      const { body: res } = await request(app).post('/v0/pools')
        .send({
          ethereum: 1,
          poolAddress: '0xc59d88285ab60abbf44ed551d554e86d4ab34442',
          payload,
          signature: tx.signature,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      const pool = Pool.factory(res)

      for (const key in pool) {
        if (Object.prototype.hasOwnProperty.call(pool, key) && _.get(pool, key)) {
          expect(res).to.have.property(key)
        }
      }
    })

    it('DELETE /v0/pools/unpublish/:poolAddress', async () => {
      const payload = JSON.stringify({
        poolAddress: '0xc59d88285ab60abbf44ed551d554e86d4ab34442',
      })
      const web3 = getEthWeb3(Blockchain.Ethereum.Network.MAIN)
      const wallet = web3.eth.accounts.privateKeyToAccount(appConf.tests.privateKey)
      const tx = wallet.sign(payload)
      const { body: res } = await request(app).delete('/v0/pools')
        .send({
          ethereum: 1,
          poolAddress: '0xc59d88285ab60abbf44ed551d554e86d4ab34442',
          payload,
          signature: tx.signature,
        })
        .expect('Content-Type', /json/)
        .expect(200)

      const pool = Pool.factory(res)

      for (const key in pool) {
        if (Object.prototype.hasOwnProperty.call(pool, key) && _.get(pool, key)) {
          expect(res).to.have.property(key)
        }
      }
    })
  })

  describe.skip('Ethereum Rinkeby', () => {
    let collections: Collection[] = []

    before(async () => {
      collections = await getCollections({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.MAIN } })
    })

    it('GET /v0/pools/groups/collection?collectionAddress=*', async () => {
      await Promise.all(collections.map(async collection => {
        const { body: res } = await request(app).get('/v0/pools/groups/collection')
          .query({
            ethereum: Blockchain.Ethereum.Network.RINKEBY,
            collectionAddress: collection.address,
          })
          .expect('Content-Type', /json/)
          .expect(200)

        expect(res).be.an('array')
        res.every((poolGroup: any) => expect(poolGroup).to.have.keys(...Object.keys(PoolGroup.codingResolver)))
      }))
    })
  })
})
