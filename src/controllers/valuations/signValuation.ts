import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Valuation } from '../../entities'
import fault from '../../utils/fault'
import { getPoolContract } from '../contracts'
import getEthWeb3 from '../utils/getEthWeb3'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  nftId: string
  valuation: Valuation
  poolVersion: number
}

type Output = {
  expiresAtBlock: number
  issuedAtBlock: number
  signature: string
}

export default async function signValuation({ blockchain, nftId, collectionAddress, valuation, poolVersion }: Params): Promise<Output> {
  switch (blockchain.network) {
  case 'ethereum':
  case 'polygon': {
    const web3 = getEthWeb3(blockchain.networkId)
    const blockNumber = await web3.eth.getBlockNumber()
    const expiresAtBlock = blockNumber + appConf.ethValuationExpiryBlocks
    const valuationEth = valuation.value?.amount

    if (!valuationEth?.isFinite()) throw fault('ERR_SIGN_VALUATION', 'Valuation is invalid')
    if ((valuation?.timestamp || 0) < new Date().getTime() - appConf.valuationLimitation) throw fault('INVALID_VALUATION_TIMESTAMP')

    const contract = await getPoolContract({ blockchain, poolAddress: _.get(appConf.valuationSignerMessageHashAddress, blockchain.networkId) })
    const contractFunc = 'getMessageHash'
    const contractParams = [
      collectionAddress,
      nftId,
      web3.utils.toWei(valuationEth.toFixed(18)),
      expiresAtBlock,
    ]
    const messageHash = await contract.methods[contractFunc].apply(undefined, contractParams).call()
    if (poolVersion > 3) {
      // const kmsCredentials = appConf.env === 'development' ? appConf.devKmsCredentials : appConf.prodKmsCredenials

      // const provider = new ethers.providers.AlchemyProvider(Number(blockchain.networkId), appConf.alchemyAPIKey)

      // let signer = new GcpKmsSigner(kmsCredentials)
      // signer = signer.connect(provider)
      // const signature = await signer.signMessage(ethers.utils.arrayify(messageHash))

      return {
        expiresAtBlock,
        issuedAtBlock: blockNumber,
        signature: '',
      }
    }

    const { signature } = appConf.ethValuationSigner ? web3.eth.accounts.sign(messageHash, appConf.ethValuationSigner) : { signature: 'undefined' }

    return {
      expiresAtBlock,
      issuedAtBlock: blockNumber,
      signature,
    }
  }
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}
