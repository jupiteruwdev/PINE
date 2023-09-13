import BigNumber from 'bignumber.js'
import { expect } from 'chai'
import esmock from 'esmock'
import { Blockchain } from '../../entities'

describe('valuations', () => {
  let getRequestStub: (url?: string) => Promise<any>

  afterEach(() => {
    esmock.purge('../utils/getRequest')
  })

  describe('useReservoirCollectionValuation', () => {
    it('should fetch collection valuation with collection address', async () => {
      const fakeData = {
        'collections': [
          {
            'floorAsk': {
              'price': {
                'amount': {
                  'native': 1,
                },
              },
            },
          },
        ],
      }
      getRequestStub = async () => fakeData
      const { useReservoirCollectionValuation } = await esmock('./useReservoirAPI', {
        '../utils/getRequest': getRequestStub,
      })
      const valuation = await useReservoirCollectionValuation({ collectionAddress: 'test', blockchain: Blockchain.Ethereum() })

      expect(valuation.value.amount).to.eql(new BigNumber(1))
      expect(valuation.value.currency).to.eql('ETH')
    })

    it('should fetch collection valuation with collection address and nftId', async () => {
      const tokenFakeData = {
        'tokens': [
          {
            'token': {
              'collection': {
                'id': '0x059edd72cd353df5106d2b9cc5ab83a52287ac3a:0:999999',
              },
            },
          },
        ],
      }

      const fakeData = {
        'collections': [
          {
            'floorAsk': {
              'price': {
                'amount': {
                  'native': 10.4,
                },
              },
            },
          },
        ],
      }
      getRequestStub = async (url?: string) => {
        if (url?.includes('tokens')) {
          return tokenFakeData
        }
        return fakeData
      }
      const { useReservoirCollectionValuation } = await esmock('./useReservoirAPI', {
        '../utils/getRequest': getRequestStub,
      })
      const valuation = await useReservoirCollectionValuation({ collectionAddress: 'test', blockchain: Blockchain.Ethereum() })

      expect(valuation.value.amount).to.eql(new BigNumber(10.4))
      expect(valuation.value.currency).to.eql('ETH')
    })

    it('should revert when reservoir returns wrong data', async () => {
      const fakeData = {
        'collections': [
          {
            'floorAsk': {
              'price': {
                'amount': {
                  'native': null,
                },
              },
            },
          },
        ],
      }
      getRequestStub = async () => fakeData
      const { useReservoirCollectionValuation } = await esmock('./useReservoirAPI', {
        '../utils/getRequest': getRequestStub,
      })
      try {
        await useReservoirCollectionValuation({ collectionAddress: 'test', blockchain: Blockchain.Ethereum() })
      }
      catch (err: any) {
        expect(err.message).to.equal('ERR_USE_RESERVOIR')
      }
    })
  })
})
