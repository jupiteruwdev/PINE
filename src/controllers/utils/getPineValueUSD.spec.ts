import BigNumber from 'bignumber.js'
import { assert, expect } from 'chai'
import getPineValueUSD from './getPineValueUSD'

describe('controllers/utils/getPineValueUSD', () => {
  it('can get current PINE price in USD', async () => {
    const valueUSD = await getPineValueUSD()
    expect(valueUSD).to.be.an('object')
    assert.isTrue(BigNumber.isBigNumber(valueUSD.amount))
    assert.isTrue(valueUSD.amount.isFinite())
    assert.isAbove(valueUSD.amount.toNumber(), 0, 'Amount should be greater than 0')
  })

  it('can get custom PINE price in USD', async () => {
    const customAmount = 100
    const valueUSD = await getPineValueUSD(customAmount)
    expect(valueUSD).to.be.an('object')
    assert.isTrue(BigNumber.isBigNumber(valueUSD.amount))
    assert.isTrue(valueUSD.amount.isFinite())
    assert.isAbove(valueUSD.amount.toNumber(), 0, 'Amount should be greater than 0')
    assert.equal(valueUSD.amount.dividedBy(customAmount).toNumber(), (await getPineValueUSD()).amount.toNumber(), 'Custom amount should be proportional')
  })

  it('handles invalid input gracefully', async () => {
    try {
      await getPineValueUSD(-1)
      assert.fail('Should throw an error for negative amount')
    }
    catch (error) {
      expect(error).to.exist
    }
  })
})
