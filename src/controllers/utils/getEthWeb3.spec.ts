import { assert } from 'chai'
import { Blockchain } from '../../entities'
import getEthWeb3 from './getEthWeb3'

describe('controllers/utils/getEthWeb3', () => {
  it('can create Web3 object for Mainnet', async () => {
    assert(getEthWeb3(Blockchain.Ethereum.Network.MAIN))
  })

  it('can create Web3 object for Rinkeby', async () => {
    assert(getEthWeb3(Blockchain.Ethereum.Network.RINKEBY))
  })
})
