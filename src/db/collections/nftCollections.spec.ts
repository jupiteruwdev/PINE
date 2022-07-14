import { assert } from 'chai'
import { describe, it } from 'mocha'
import { Blockchain } from '../../entities'
import * as collections from './nftCollections'

describe('db/nftCollections', () => {
  it('can find all collections in existence', async () => {
    const res = await collections.findAllCollections()
    assert.isArray(res)
    assert.isTrue(res.length > 0)
  })

  it('can find all collections on Ethereum Mainnet only', async () => {
    const res = await collections.findAllCollections({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.MAIN } })
    assert.isArray(res)
    assert.isTrue(res.length > 0)
    assert.isTrue(res.reduce((out, curr) => out && (curr.blockchain.network === 'ethereum' && curr.blockchain.networkId === Blockchain.Ethereum.Network.MAIN), true))
  })

  it('can find all collections on Ethereum Rinkeby only', async () => {
    const res = await collections.findAllCollections({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.RINKEBY } })
    assert.isArray(res)
    assert.isTrue(res.length > 0)
    assert.isTrue(res.reduce((out, curr) => out && (curr.blockchain.network === 'ethereum' && curr.blockchain.networkId === Blockchain.Ethereum.Network.RINKEBY), true))
  })

  it('can find no collections on an empty filter', async () => {
    const res = await collections.findAllCollections({ blockchainFilter: {} })
    assert.isArray(res)
    assert.isTrue(res.length === 0)
  })
})
