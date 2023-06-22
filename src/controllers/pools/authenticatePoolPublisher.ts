import _ from 'lodash'
import ERC721LendingV2 from '../../abis/ERC721LendingV2.json' assert { type: 'json' }
import fault from '../../utils/fault'
import getEthWeb3 from '../utils/getEthWeb3'

type Params = {
  poolAddress: string
  payload: string
  signature: string
  networkId: string
}

export default async function authenticatePoolPublisher({ poolAddress, payload, signature, networkId }: Params) {
  try {
    const web3 = getEthWeb3(networkId)
    const signer = web3.eth.accounts.recover(payload, signature)
    const payloadObj = JSON.parse(payload)
    const poolContract = new web3.eth.Contract(ERC721LendingV2 as any, _.get(payloadObj, 'poolAddress'))
    const poolOwner = await poolContract.methods.owner().call()
    if (poolOwner.toLowerCase() !== signer.toLowerCase() || poolAddress.toLowerCase() !== _.get(payloadObj, 'poolAddress').toLowerCase()) throw fault('ERR_AUTH_FAILED')
  }
  catch (err) {
    throw fault('ERR_AUTHENTICATE_POOL_PUBLISHER', undefined, err)
  }
}
