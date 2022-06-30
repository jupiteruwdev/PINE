import { assert } from 'chai'
import { describe, it } from 'mocha'
import { Blockchain } from '../../entities'
import * as pools from './pools'

describe('db/pools', () => {
  it('can find all pools in existence', async () => {
    const res = await pools.findAllPools()
    assert.isArray(res)
    assert.isTrue(res.length > 0)
  })

  it('can find all pools on Ethereum Mainnet only', async () => {
    const res = await pools.findAllPools({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.MAIN } })
    assert.isTrue(res.length > 0)
    assert.isTrue(res.reduce((out, curr) => out && (curr.blockchain.network === 'ethereum' && curr.blockchain.networkId === Blockchain.Ethereum.Network.MAIN), true))
  })

  it('can find all pools on Ethereum Rinkeby only', async () => {
    const res = await pools.findAllPools({ blockchainFilter: { ethereum: Blockchain.Ethereum.Network.RINKEBY } })
    assert.isArray(res)
    assert.isTrue(res.length > 0)
    assert.isTrue(res.reduce((out, curr) => out && (curr.blockchain.network === 'ethereum' && curr.blockchain.networkId === Blockchain.Ethereum.Network.RINKEBY), true))
  })

  it('can find no pools on an empty blockchain filter', async () => {
    const res = await pools.findAllPools({ blockchainFilter: {} })
    assert.isArray(res)
    assert.isTrue(res.length === 0)
  })
})
