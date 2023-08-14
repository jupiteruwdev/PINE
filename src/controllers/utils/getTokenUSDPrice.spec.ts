import sinon from 'sinon'
import { expect } from 'chai'
import getTokenUSDPrice, { AvailableToken } from './getTokenUSDPrice'
import redis from '../../utils/redis'
import getEthValueUSD from './getEthValueUSD'
import BigNumber from 'bignumber.js'

describe('getTokenUSDPrice', () => {
  let getEthValueUSDStub: sinon.SinonStub
  let getRedisCacheStub: sinon.SinonStub
  let setRedisCacheStub: sinon.SinonStub

  beforeEach(() => {
    getEthValueUSDStub = sinon.stub(getEthValueUSD, 'getEthValueUSD')
    getRedisCacheStub = sinon.stub(redis, 'getRedisCache')
    setRedisCacheStub = sinon.stub(redis, 'setRedisCache')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should fetch ETH value from cache', async () => {
    const cachedValue = { amount: new BigNumber(1000), currency: 'USD' }
    getRedisCacheStub.resolves(cachedValue)

    const result = await getTokenUSDPrice(AvailableToken.ETH)

    expect(result).to.eql(cachedValue)
    expect((getRedisCacheStub as sinon.SinonStub).calledWith('eth:value:usd')).to.be.true
  })

  it('should fetch ETH value from coingeco if not cached', async () => {
    const ethValue = { amount: new BigNumber(1000), currency: 'USD' }
    getRedisCacheStub.resolves(null)
    getEthValueUSDStub.resolves(ethValue)

    const result = await getTokenUSDPrice(AvailableToken.ETH)

    expect(result).to.eql(ethValue)
    expect((getRedisCacheStub as sinon.SinonStub).calledWith('eth:value:usd')).to.be.true
    expect((setRedisCacheStub as sinon.SinonStub).calledWith('eth:value:usd', ethValue, { EX: 60 })).to.be.true
  })

})
