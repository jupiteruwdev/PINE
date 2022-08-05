import { expect } from 'chai'
import request from 'supertest'
import app from '../../src/app'
import { getCollections } from '../../src/controllers'
import { Blockchain, Value } from '../../src/entities'

describe('GET /v0/collections/floors', () => {
  it('can get floor prices by colletion addresses on Ethereum Mainnet', async () => {
    const collections = await getCollections({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.MAIN } })

    const { body: res } = await request(app).get('/v0/collections/floors')
      .query({
        ethereum: Blockchain.Ethereum.Network.MAIN,
        collectionAddresses: collections.map(t => t.address),
      })
      .expect('Content-Type', /json/)
      .expect(200)

    expect(res).to.have.length(collections.length)
    res.every((t: any) => expect(t).to.have.keys(...Object.keys(Value.codingResolver)))
  })

  it('can get floor prices by collection addresses on Ethereum Rinkeby', async () => {
    const collections = await getCollections({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.RINKEBY } })

    const { body: res } = await request(app).get('/v0/collections/floors')
      .query({
        ethereum: Blockchain.Ethereum.Network.RINKEBY,
        collectionAddresses: collections.map(t => t.address),
      })
      .expect('Content-Type', /json/)
      .expect(200)

    expect(res).to.have.length(collections.length)
    res.every((t: any) => expect(t).to.have.keys(...Object.keys(Value.codingResolver)))
  })
})
