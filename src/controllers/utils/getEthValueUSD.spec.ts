import BigNumber from 'bignumber.js'
import { assert, expect } from 'chai'
import { getEthValueUSD } from './getEthValueUSD'

describe('controllers/utils/getEthValueUSD', () => {
  it('can get current ETH price in USD', async () => {
    const valueUSD = await getEthValueUSD()
    expect(valueUSD).to.be.an('object')
    assert.isTrue(BigNumber.isBigNumber(valueUSD.amount))
    assert.isTrue(valueUSD.amount.isFinite())
  })

  it('can get custom ETH price in USD', async () => {
    const valueUSD = await getEthValueUSD(100)
    expect(valueUSD).to.be.an('object')
    assert.isTrue(BigNumber.isBigNumber(valueUSD.amount))
    assert.isTrue(valueUSD.amount.isFinite())
  })
})
