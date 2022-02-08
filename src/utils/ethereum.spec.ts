import { assert, expect } from 'chai'
import _ from 'lodash'
import { describe, it } from 'mocha'
import { EthNetwork, getEthBlockNumber, getEthPriceUSD, getWeb3 } from './ethereum'

describe('utils/ethereum', () => {
  it('can create Web3 object for Mainnet', async () => {
    assert(getWeb3(EthNetwork.MAIN))
  })

  it('can create Web3 object for Rinkeby', async () => {
    assert(getWeb3(EthNetwork.RINKEBY))
  })

  it('can get current block number on Mainnet', async () => {
    assert(_.isNumber(await getEthBlockNumber(EthNetwork.MAIN)))
  })

  it('can get current block number on Rinkeby', async () => {
    assert(_.isNumber(await getEthBlockNumber(EthNetwork.RINKEBY)))
  })

  it('can get current ETH price', async () => {
    const price = await getEthPriceUSD()
    expect(price).to.be.a('number')
    expect(price).is.not.NaN
  })
})
