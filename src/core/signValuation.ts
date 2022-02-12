import _ from 'lodash'
import appConf from '../app.conf'
import Blockchain, { EthBlockchain } from '../entities/Blockchain'
import Valuation from '../entities/Valuation'
import { getEthBlockNumber, getEthWeb3 } from '../utils/ethereum'
import failure from '../utils/failure'
import getPoolContract from './getPoolContract'

type Params = {
  collectionAddress: string
  nftId: string
  poolAddress: string
  valuation: Valuation
}

type Output = {
  expiresAtBlock: number
  issuedAtBlock: number
  signature: string
}

export default async function signValuation({ nftId, poolAddress, collectionAddress, valuation }: Params, blockchain: Blockchain = EthBlockchain()): Promise<Output> {
  switch (blockchain.network) {
  case 'ethereum': {
    const web3 = getEthWeb3(blockchain.networkId)
    const blockNumber = await getEthBlockNumber(blockchain.networkId)
    const expiresAtBlock = blockNumber + appConf.ethValuationExpiryBlocks

    const contract = getPoolContract({ poolAddress }, blockchain)
    const contractFunc = 'getMessageHash'
    const contractParams = [
      collectionAddress,
      _.toNumber(nftId),
      web3.utils.toWei(_.toString(valuation.value.amount)),
      expiresAtBlock,
    ]

    const messageHash = await contract.methods[contractFunc].apply(undefined, contractParams).call()
    const { signature } = appConf.ethValuationSigner ? web3.eth.accounts.sign(messageHash, appConf.ethValuationSigner) : { signature: 'undefined' }

    return {
      expiresAtBlock,
      issuedAtBlock: blockNumber,
      signature,
    }
  }
  default:
    throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
