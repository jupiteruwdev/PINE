import { assert } from 'chai'
import { describe, it } from 'mocha'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import * as pools from './pools'

describe('db/pools', () => {
  it('can find all pools in existence', async () => {
    const res = await pools.findAll()
    assert.isArray(res)
    assert.isTrue(res.length > 0)
  })

  it('can find all pools on Ethereum Mainnet only', async () => {
    const res = await pools.findAll({ blockchainFilter: { ethereum: EthereumNetwork.MAIN } })
    assert.isTrue(res.length > 0)
    assert.isTrue(res.reduce((out, curr) => out && (curr.blockchain.network === 'ethereum' && curr.blockchain.networkId === EthereumNetwork.MAIN), true))
  })

  it('can find all pools on Ethereum Rinkeby only', async () => {
    const res = await pools.findAll({ blockchainFilter: { ethereum: EthereumNetwork.RINKEBY } })
    assert.isArray(res)
    assert.isTrue(res.length > 0)
    assert.isTrue(res.reduce((out, curr) => out && (curr.blockchain.network === 'ethereum' && curr.blockchain.networkId === EthereumNetwork.RINKEBY), true))
  })

  it('can find no pools on an empty blockchain filter', async () => {
    const res = await pools.findAll({ blockchainFilter: {} })
    assert.isArray(res)
    assert.isTrue(res.length === 0)
  })
})
