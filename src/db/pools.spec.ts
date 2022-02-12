import { assert } from 'chai'
import { describe, it } from 'mocha'
import { EthNetwork } from '../utils/ethereum'
import * as pools from './pools'

describe('db/pools', () => {
  it('can find all pools in existence', async () => {
    const res = await pools.findAll()
    assert.isArray(res)
    assert.isTrue(res.length > 0)
  })

  it('can find all pools on Ethereum Mainnet only', async () => {
    const res = await pools.findAll({ blockchains: { ethereum: EthNetwork.MAIN } })
    assert.isTrue(res.length > 0)
    assert.isTrue(res.reduce((out, curr) => out && (curr.blockchain.network === 'ethereum' && curr.blockchain.networkId === EthNetwork.MAIN), true))
  })

  it('can find all pools on Ethereum Rinkeby only', async () => {
    const res = await pools.findAll({ blockchains: { ethereum: EthNetwork.RINKEBY } })
    assert.isArray(res)
    assert.isTrue(res.length > 0)
    assert.isTrue(res.reduce((out, curr) => out && (curr.blockchain.network === 'ethereum' && curr.blockchain.networkId === EthNetwork.RINKEBY), true))
  })

  it('can find no pools on an empty blockchain filter', async () => {
    const res = await pools.findAll({ blockchains: {} })
    assert.isArray(res)
    assert.isTrue(res.length === 0)
  })
})
