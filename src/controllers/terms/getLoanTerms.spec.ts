import { expect } from 'chai'
import { initDb } from '../../database'
import { Blockchain } from '../../entities'
import getLoanTerms from './getLoanTerms'

describe('controllers/terms/getLoanTerms', () => {
  before('connect to db', async () => {
    await initDb()
  })

  describe('Mainnet', () => {
    const blockchain = Blockchain.Ethereum(Blockchain.Ethereum.Network.MAIN)

    it('cannot get loan terms with invalid collection and nftid', async () => {
      try {
        getLoanTerms({
          blockchain,
          collectionAddresses: ['0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85'],
          nftIds:
            ['106369246037029649328055829632442584247486253961123343830773461538413336232366'],
        })
      }
      catch (err: any) {
        expect(err.message).to.be('No matching collection found in db')
      }
    })
  })
})
