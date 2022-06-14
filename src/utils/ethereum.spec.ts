import BigNumber from 'bignumber.js'
import { assert, expect } from 'chai'
import _ from 'lodash'
import { describe, it } from 'mocha'
import { EthereumNetwork } from '../entities'
import { getEthBlockNumber, getEthValueUSD, getEthWeb3 } from './ethereum'

describe('utils/ethereum', () => {
  it('can create Web3 object for Mainnet', async () => {
    assert(getEthWeb3(EthereumNetwork.MAIN))
  })

  it('can create Web3 object for Rinkeby', async () => {
    assert(getEthWeb3(EthereumNetwork.RINKEBY))
  })

  it('can get current block number on Mainnet', async () => {
    assert(_.isNumber(await getEthBlockNumber(EthereumNetwork.MAIN)))
  })

  it('can get current block number on Rinkeby', async () => {
    assert(_.isNumber(await getEthBlockNumber(EthereumNetwork.RINKEBY)))
  })

  it('can get current ETH price', async () => {
    const valueUSD = await getEthValueUSD()
    expect(valueUSD).to.be.an('object')
    assert.isTrue(BigNumber.isBigNumber(valueUSD.amount))
    assert.isFalse(valueUSD.amount.isNaN())
  })
})
