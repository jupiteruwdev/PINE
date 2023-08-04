import { expect } from 'chai'
import { describe, it } from 'mocha'
import { initDb } from '../../database'
import { Blockchain, Collection } from '../../entities'
import getCollections from './getCollections'

describe('controllers/collections/getCollections', () => {
  before('connect to db', async () => {
    await initDb()
  })

  describe('Mainnet', () => {
    it('can fetch all saved collections', async () => {
      const collections = await getCollections({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.MAIN } })
      expect(collections).to.have.length.greaterThan(0)
      collections.every(collection => expect(collection).to.have.all.keys(...Object.keys(Collection.codingResolver)))
    })
  })

  describe.skip('Rinkeby', () => {
    it('can fetch all saved collections', async () => {
      const collections = await getCollections({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.RINKEBY } })
      expect(collections).to.have.length.greaterThan(0)
      collections.every(collection => expect(collection).to.have.all.keys(...Object.keys(Collection.codingResolver)))
    })
  })
})
