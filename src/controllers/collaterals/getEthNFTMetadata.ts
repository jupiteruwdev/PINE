import _ from 'lodash'
import ERC721EnumerableABI from '../../abis/ERC721Enumerable.json' assert { type: 'json' }
import { Blockchain, NFTMetadata } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getRedisCache, setRedisCache } from '../../utils/redis'
import rethrow from '../../utils/rethrow'
import DataSource from '../utils/DataSource'
import getEthWeb3 from '../utils/getEthWeb3'
import getRequest from '../utils/getRequest'
import normalizeIPFSUri from '../utils/normalizeIPFSUri'
import { useReservoirByTokenDetails } from '../utils/useReservoirAPI'

type Params = {
  blockchain?: Blockchain
  collectionAddress?: string
  nftId?: string
  tokenUri?: string
}

/**
 * Fetches Ethereum NFT metadata using multiple strategies in the following order:
 *   1. If the `tokenUri` is provided, this method will directly query the `tokenUri` first. This is
 *      least expensive strategy.
 *   2. If `blockchain`, `collectionAddress` and `nftId` are provided, this method will query a
 *      known third-party data source.
 *   3. If #2 fails, this method will query the contract directly.
 *
 * @param param - See {@link params}.
 *
 * @returns The {@link NFTMetadata}. Note that this method never throws, so all properties are
 *          optional.
 */
export default async function getEthNFTMetadata({
  blockchain,
  collectionAddress,
  nftId,
  tokenUri,
}: Params): Promise<NFTMetadata> {
  // TODO: use XPath to get pageprops for solv SFTs
  try {
    const redisKey = `nft:metadata:${collectionAddress?.toLowerCase()}:${nftId ? `${nftId}:` : ''}${blockchain?.networkId}`

    const data = await getRedisCache(redisKey)

    if (data) {
      return data as NFTMetadata
    }

    const metadata = await DataSource.fetch(
      useTokenUri({ tokenUri }),
      useReservoir({ blockchain, collectionAddress, nftId }),
      useContract({ blockchain, collectionAddress, nftId }),
    )

    await setRedisCache(redisKey, metadata)

    return metadata
  }
  catch (err: any) {
    logger.error(`get eth nft metadata error: ${err.mesasge}`)
    return {}
  }
}

export function useReservoir({ blockchain, collectionAddress, nftId }: Omit<Params, 'tokenUri'>): DataSource<NFTMetadata> {
  return async () => {
    try {
      logger.info(`...using Reservoir to look up metadata for NFT <${collectionAddress}/${nftId}}>`)

      if (!blockchain || !Blockchain.isEVMChain(blockchain)) rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

      const collectionInfo = await useReservoirByTokenDetails({ collectionAddress: collectionAddress ?? '', nftId, blockchain })

      const name = _.get(collectionInfo, 'name', '')
      const imageUrl = _.get(collectionInfo, 'image', '')

      return {
        imageUrl: normalizeIPFSUri(imageUrl),
        name,
      }
    }
    catch (err) {
      throw fault('ERR_GET_ETH_NFT_METADATA_USE_RESERVOIR', undefined, err)
    }
  }
}

export function useContract({ blockchain, collectionAddress, nftId }: Omit<Params, 'tokenUri'>): DataSource<NFTMetadata> {
  return async () => {
    try {
      logger.info(`...using contract to look up metadata for NFT <${collectionAddress}/${nftId}}>`)

      if (!blockchain || !Blockchain.isEVMChain(blockchain)) rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

      const web3 = getEthWeb3(blockchain.networkId)
      const contract = new web3.eth.Contract(ERC721EnumerableABI as any, collectionAddress)
      const tokenUri = await contract.methods.tokenURI(nftId).call()
      const dataSource = useTokenUri({ tokenUri })

      return dataSource.apply(undefined).catch(err => rethrow(`No name and image URL found in metadata for contract <${collectionAddress}/${nftId}}>`))
    }
    catch (err) {
      throw fault('ERR_GET_ETH_NFT_METADATA_USE_CONTRACT', undefined, err)
    }
  }
}

export function useTokenUri({ tokenUri }: Pick<Params, 'tokenUri'>): DataSource<NFTMetadata> {
  return async () => {
    try {
      logger.info(`...using token URI <${tokenUri}> to look up metadata for NFT`)

      if (tokenUri === undefined) rethrow(`Failed to fetch NFT metadata from token URI <${tokenUri}>`)

      let res: any

      if (tokenUri.indexOf('data:application/json;base64') > -1) {
        res = JSON.parse(atob(tokenUri.split(',')[1]))
      }
      else if (tokenUri.indexOf('data:application/json;utf8') > -1) {
        const firstComma = tokenUri.indexOf(',')
        res = JSON.parse(tokenUri.slice(firstComma + 1, tokenUri.length))
      }
      else {
        res = await getRequest(normalizeIPFSUri(tokenUri))
      }

      const name = _.get(res, 'name')
      const imageUrl = ['image', 'image_url'].reduceRight((prev, curr) => !_.isEmpty(prev) ? prev : _.get(res, curr), '')

      if (_.isEmpty(name) && _.isEmpty(imageUrl)) rethrow(`No name and image URL found in metadata for token URI <${tokenUri}>`)

      const metadata = {
        imageUrl: !_.isNil(imageUrl) ? normalizeIPFSUri(imageUrl) : undefined,
        name,
      }

      return metadata
    }
    catch (err) {
      throw fault('ERR_GET_ETH_NFT_METADATA_USE_TOKEN_URI', undefined, err)
    }
  }
}
