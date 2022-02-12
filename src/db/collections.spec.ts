import { assert } from 'chai'
import { describe, it } from 'mocha'
import { EthNetwork } from '../utils/ethereum'
import * as collections from './collections'

describe('db/collections', () => {
  it('can find all collections in existence', async () => {
    const res = await collections.findAll()
    assert.isArray(res)
    assert.isTrue(res.length > 0)
  })

  it('can find all collections on Ethereum Mainnet only', async () => {
    const res = await collections.findAll({ blockchains: { ethereum: EthNetwork.MAIN } })
    assert.isArray(res)
    assert.isTrue(res.length > 0)
    assert.isTrue(res.reduce((out, curr) => out && (curr.blockchain.network === 'ethereum' && curr.blockchain.networkId === EthNetwork.MAIN), true))
  })

  it('can find all collections on Ethereum Rinkeby only', async () => {
    const res = await collections.findAll({ blockchains: { ethereum: EthNetwork.RINKEBY } })
    assert.isArray(res)
    assert.isTrue(res.length > 0)
    assert.isTrue(res.reduce((out, curr) => out && (curr.blockchain.network === 'ethereum' && curr.blockchain.networkId === EthNetwork.RINKEBY), true))
  })

  it('can find no collections on an empty filter', async () => {
    const res = await collections.findAll({ blockchains: {} })
    assert.isArray(res)
    assert.isTrue(res.length === 0)
  })
})
