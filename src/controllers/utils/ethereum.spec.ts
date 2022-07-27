import { assert } from 'chai'
import _ from 'lodash'
import { describe, it } from 'mocha'
import { Blockchain } from '../../entities'
import { getEthBlockNumber, getEthWeb3 } from './ethereum'

describe('controllers/utils/ethereum', () => {
  it('can create Web3 object for Mainnet', async () => {
    assert(getEthWeb3(Blockchain.Ethereum.Network.MAIN))
  })

  it('can create Web3 object for Rinkeby', async () => {
    assert(getEthWeb3(Blockchain.Ethereum.Network.RINKEBY))
  })

  it('can get current block number on Mainnet', async () => {
    assert(_.isNumber(await getEthBlockNumber(Blockchain.Ethereum.Network.MAIN)))
  })

  it('can get current block number on Rinkeby', async () => {
    assert(_.isNumber(await getEthBlockNumber(Blockchain.Ethereum.Network.RINKEBY)))
  })
})
