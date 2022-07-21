import ERC721EnumerableABI from '../../abis/ERC721Enumerable.json'
import appConf from '../../app.conf'
import { Blockchain, NFTMetadata } from '../../entities'
import fault from '../../utils/fault'
import { getEthWeb3 } from '../utils/ethereum'
import getRequest from '../utils/getRequest'
import normalizeNFTImageUri from '../utils/normalizeNFTImageUri'
import _ from 'lodash'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  nftId: string
}

export default async function getNFTMetadata({ blockchain, collectionAddress, nftId }: Params): Promise<NFTMetadata> {
  switch (blockchain.network) {
  case 'ethereum': {
    const alchemyUrl = _.get(appConf.alchemyAPIUrl, blockchain.networkId)
    const nftRes = await getRequest(`${alchemyUrl}${appConf.alchemyAPIKey}/getNFTMetadata?contractAddress=${collectionAddress}&tokenId=${nftId}`)
    if (!nftRes.error && nftRes.metadata && nftRes.metadata.name && nftRes.metadata.image_url) {
      return {
        imageUrl: _.get(nftRes, 'metadata.image_url'),
        name: _.get(nftRes, 'metadata.name'),
      }
    }
    const web3 = getEthWeb3(blockchain.networkId)
    const contract = new web3.eth.Contract(ERC721EnumerableABI as any, collectionAddress)
    const uri = await contract.methods.tokenURI(nftId).call()
    const metadata = await (async () => {
      if (uri.indexOf('data:application/json;base64') !== -1) {
        return JSON.parse(atob(uri.split(',')[1]))
      }
      else if (uri.indexOf('data:application/json;utf8') !== -1) {
        const firstComma = uri.indexOf(',')
        return JSON.parse(uri.slice(firstComma + 1, uri.length))
      }
      try {
        const ret = await getRequest(normalizeNFTImageUri(uri))
        return ret
      }
      catch (e) {
        return {
          imageUrl: uri,
          id: nftId,
        }
      }
    })()
    return {
      imageUrl: normalizeNFTImageUri(metadata.image),
      name: metadata.name ?? `#${metadata.id ?? nftId}`,
    }
  }
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}
