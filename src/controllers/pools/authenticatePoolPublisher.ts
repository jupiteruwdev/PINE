import getEthWeb3 from '../utils/getEthWeb3'
import ERC721LendingV2 from '../../abis/ERC721LendingV2.json'
import _ from 'lodash'
import fault from '../../utils/fault'

type Params = {
  poolAddress: string
  payload: string
  signature: string
  networkId: string
}

export default async function authenticatePoolPublisher({ poolAddress, payload, signature, networkId }: Params) {
  const web3 = getEthWeb3(networkId)
  const signer = web3.eth.accounts.recover(payload, signature)
  const payloadObj = JSON.parse(payload)
  const poolContract = new web3.eth.Contract(ERC721LendingV2 as any, _.get(payloadObj, 'poolAddress'))
  const poolOwner = await poolContract.methods.owner()
  if (poolOwner !== signer || poolAddress !== _.get(payloadObj, 'poolAddress')) throw fault('ERR_AUTH_FAILED')
}
