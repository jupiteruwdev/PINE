import _ from 'lodash'
import ERC721EnumerableABI from '../../abis/ERC721Enumerable.json'
import appConf from '../../app.conf'
import { Blockchain, NFTMetadata } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import getEthWeb3 from '../utils/getEthWeb3'
import getRequest from '../utils/getRequest'
import normalizeIPFSUri from '../utils/normalizeIPFSUri'

type Params = {
  blockchain: Blockchain
  collectionAddress: string
  nftId: string
}

export default async function getNFTMetadata({
  blockchain,
  collectionAddress,
  nftId,
}: Params): Promise<NFTMetadata> {
  switch (blockchain.network) {
  case 'ethereum': {
    try {
      logger.info(`Fetching metadata for NFT <${nftId}> of collection <${collectionAddress}>...`)

      try {
        const metadata = await getMetadataFromAlchemy({ blockchain, collectionAddress, nftId })
        logger.info(`Fetching metadata for NFT <${nftId}> of collection <${collectionAddress}>... OK`)
        return metadata
      }
      catch (err) {
        logger.warn(`Fetching metadata for NFT <${nftId}> of collection <${collectionAddress}>... WARN: Failed from Alchemy, retrying with token URI`)
        const metadata = await getMetadataFromTokenUri({ blockchain, collectionAddress, nftId })
        logger.info(`Fetching metadata for NFT <${nftId}> of collection <${collectionAddress}>... OK`)
        return metadata
      }
    }
    catch (err) {
      logger.info(`Fetching metadata for NFT <${nftId}> of collection <${collectionAddress}>... ERR`)
      if (!logger.silent) console.error(err)
      throw err
    }
  }
  default:
    throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
  }
}

async function getMetadataFromAlchemy({
  blockchain,
  collectionAddress,
  nftId,
}: Params): Promise<NFTMetadata> {
  const apiUrl = _.get(appConf.alchemyAPIUrl, blockchain.networkId) ?? rethrow(`Missing Alchemy API URL for blockchain ${JSON.stringify(blockchain)}`)
  const res = await getRequest(`${apiUrl}${appConf.alchemyAPIKey}/getNFTMetadata`, {
    params: {
      contractAddress: collectionAddress,
      tokenId: nftId,
    },
  })

  const name = _.get(res, 'metadata.name') ?? rethrow('Unable to determine NFT name')
  const imageUrl = _.get(res, 'metadata.image_url') ?? rethrow('Unable to determine NFT image')

  return {
    name,
    imageUrl: normalizeIPFSUri(imageUrl),
  }
}

async function getMetadataFromTokenUri({
  blockchain,
  collectionAddress,
  nftId,
}: Params): Promise<NFTMetadata> {
  const web3 = getEthWeb3(blockchain.networkId)
  const contract = new web3.eth.Contract(ERC721EnumerableABI as any, collectionAddress)
  const tokenUri = await contract.methods.tokenURI(nftId).call()
  const metadata = await (async () => {
    if (tokenUri.indexOf('data:application/json;base64') !== -1) {
      return JSON.parse(atob(tokenUri.split(',')[1]))
    }

    if (tokenUri.indexOf('data:application/json;utf8') !== -1) {
      const firstComma = tokenUri.indexOf(',')
      return JSON.parse(tokenUri.slice(firstComma + 1, tokenUri.length))
    }

    try {
      const res = await getRequest(normalizeIPFSUri(tokenUri))
      return res
    }
    catch (err) {
      return {
        image: tokenUri,
      }
    }
  })()

  return {
    imageUrl: normalizeIPFSUri(metadata.image),
    name: metadata.name ?? `#${metadata.id ?? nftId}`,
  }
}
