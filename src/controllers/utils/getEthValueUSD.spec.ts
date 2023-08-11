import BigNumber from 'bignumber.js'
import { expect } from 'chai'
import getEthValueUSD from './getEthValueUSD'
import { AvailableToken } from './getTokenUSDPrice'

describe('controllers/utils/getEthValueUSD', () => {
  const tokensToTest = [AvailableToken.ETH, AvailableToken.MATIC]

  tokensToTest.forEach(token => {
    it(`can get current ${token} price in USD`, async () => {
      const valueUSD = await getEthValueUSD(1, token)
      expect(valueUSD).to.be.an('object')
      expect(BigNumber.isBigNumber(valueUSD.amount)).to.be.true
      expect(valueUSD.amount.isFinite()).to.be.true
      expect(valueUSD.amount.toNumber()).to.be.above(0, 'Amount should be greater than 0')
    })
  })

  it('can get custom ETH price in USD', async () => {
    const customAmount = 100
    const valueUSD = await getEthValueUSD(customAmount)
    expect(valueUSD).to.be.an('object')
    expect(BigNumber.isBigNumber(valueUSD.amount)).to.be.true
    expect(valueUSD.amount.isFinite()).to.be.true
    expect(valueUSD.amount.toNumber()).to.be.above(0, 'Amount should be greater than 0')
    expect(valueUSD.amount.toNumber()).to.equal(customAmount * (await getEthValueUSD(1)).amount.toNumber(), 'Amount should be 100 times the current ETH price')
  })
})
