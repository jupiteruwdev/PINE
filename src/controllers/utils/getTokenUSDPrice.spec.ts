import { expect } from 'chai'
import BigNumber from 'bignumber.js'
import getTokenUSDPrice, { AvailableToken } from './getTokenUSDPrice'
import { setRedisCache, getRedisCache } from '../../utils/redis'

describe('controllers/utils/getTokenUSDPrice', () => {
  const tokensToTest = [AvailableToken.ETH, AvailableToken.PINE, AvailableToken.MATIC]

  tokensToTest.forEach(token => {
    it(`can get current ${token} price in USD`, async () => {
      const valueUSD = await getTokenUSDPrice(token)
      expect(valueUSD).to.be.an('object')
      expect(BigNumber.isBigNumber(valueUSD.amount)).to.be.true
      expect(valueUSD.amount.isFinite()).to.be.true
      expect(valueUSD.amount.toNumber()).to.be.above(0, 'Amount should be greater than 0')
    })
  })

  it('can use cached value if available', async () => {
    const cachedValue = { amount: new BigNumber(1000) }
    const cacheKey = `${AvailableToken.PINE}:value:usd`
    await setRedisCache(cacheKey, cachedValue)
    const valueUSD = await getTokenUSDPrice(AvailableToken.PINE)
    expect(valueUSD).to.deep.equal(cachedValue)

    // Additional check to make sure the cache is being used
    const retrievedCache = await getRedisCache(cacheKey)
    expect(retrievedCache).to.deep.equal(cachedValue)
  })

  it('throws error for unsupported token', async () => {
    try {
      await getTokenUSDPrice('unsupported' as AvailableToken)
      expect.fail('Expected an error to be thrown')
    }
    catch (err) {
      expect(err.message).to.include('Unsupported token')
    }
  })
})
