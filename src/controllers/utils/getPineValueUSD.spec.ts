import { expect } from 'chai'
import esmock from 'esmock'
import BigNumber from 'bignumber.js'

describe('utils', () => {
  let getRequestStub: any

  class CustomError extends Error {
    code?: string
  }

  beforeEach(async () => {})

  afterEach(() => {
    esmock.purge('./getRequest')
  })

  describe('useGateIO', () => {
    it('should fetch PINE value of 2 pine token using gate.io', async () => {
      const fakeData = { quoteVolume: '3686627.3574516', baseVolume: '44655.845625521', highestBid: '0.012036', high24hr: '0.012181', last: '0.01204', lowestAsk: '0.012042', elapsed: '6ms', result: 'true', low24hr: '0.012036', percentChange: '-0.82' }
      getRequestStub = async () => fakeData
      const { useGateIO } = await esmock('./getPineValueUSD', { './getRequest': getRequestStub })
      const resultFunction = await useGateIO(2)
      const result = await resultFunction()
      const expectedValue = new BigNumber(0.02408)

      expect(result.amount.toString()).to.eql(expectedValue.toString())
      expect(result.currency).to.eql('USD')
    })

    it('should fetch PINE value without params using gate.io', async () => {
      const fakeData = { quoteVolume: '3686627.3574516', baseVolume: '44655.845625521', highestBid: '0.012036', high24hr: '0.012181', last: '0.01204', lowestAsk: '0.012042', elapsed: '6ms', result: 'true', low24hr: '0.012036', percentChange: '-0.82' }
      getRequestStub = async () => fakeData
      const { useGateIO } = await esmock('./getPineValueUSD', { './getRequest': getRequestStub })
      const resultFunction = await useGateIO()
      const result = await resultFunction()
      const expectedValue = new BigNumber(0.01204)

      expect(result.amount.toString()).to.eql(expectedValue.toString())
      expect(result.currency).to.eql('USD')
    })

    it('should handle errors from gate.io', async () => {
      getRequestStub = async () => {
        throw new Error('Network Error')
      }

      const { useGateIO } = await esmock('./getPineValueUSD', { './getRequest': getRequestStub })

      try {
        await useGateIO(2)
      }
      catch (err) {
        if (err instanceof CustomError) {
          expect(err.code).to.eql('ERR_GET_PINE_VALUE_USD_USE_GATE_IO')
        }
        else {
          throw err
        }
      }
    })
  })

  describe('useCoingecko', () => {
    it('should fetch PINE value of 3 tokens using coingecko', async () => {
      const fakeData = { pine: { usd: 0.01201002 } }
      getRequestStub = async () => fakeData

      const { useCoingecko } = await esmock('./getPineValueUSD', { './getRequest': getRequestStub })
      const resultFunction = await useCoingecko(3)
      const result = await resultFunction()
      const expectedValue = new BigNumber(0.03603006)

      expect(result.amount.toString()).to.eql(expectedValue.toString())
      expect(result.currency).to.eql('USD')
    })

    it('should fetch PINE value using coingecko without params', async () => {
      const fakeData = { pine: { usd: 0.01201002 } }
      getRequestStub = async () => fakeData

      const { useCoingecko } = await esmock('./getPineValueUSD', { './getRequest': getRequestStub })
      const resultFunction = await useCoingecko()
      const result = await resultFunction()
      const expectedValue = new BigNumber(0.01201002)

      expect(result.amount.toString()).to.eql(expectedValue.toString())
      expect(result.currency).to.eql('USD')
    })

    it('should handle errors from coingecko', async () => {
      getRequestStub = async () => {
        throw new Error('Network Error')
      }

      const { useCoingecko } = await esmock('./getPineValueUSD', { './getRequest': getRequestStub })

      try {
        await useCoingecko(3)
      }
      catch (err) {
        if (err instanceof CustomError) {
          expect(err.code).to.eql('ERR_GET_PINE_VALUE_USD_USE_COINGECKO')
        }
        else {
          throw err
        }
      }
    })
  })
})
