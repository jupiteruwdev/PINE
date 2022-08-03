import BigNumber from 'bignumber.js'
import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Collection, NFT } from '../../entities'
import { composeDataSources, DataSource } from '../../utils/dataSources'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import rethrow from '../../utils/rethrow'
import getRequest from '../utils/getRequest'
import normalizeIPFSUri from '../utils/normalizeIPFSUri'
import { useContract, useTokenUri } from './getEthNFTMetadata'

type Params = {
  blockchain: Blockchain
  ownerAddress: string
  populateMetadata: boolean
}

export default async function getEthNFTsByOwner({ blockchain, ownerAddress, populateMetadata }: Params): Promise<NFT[]> {
  logger.info(`Fetching Ethereum NFTs by owner <${ownerAddress}> on network <${blockchain.networkId}>...`)

  if (blockchain.network !== 'ethereum') throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')

  const nfts = await composeDataSources(
    useAlchemy({ blockchain, ownerAddress, populateMetadata }),
    useMoralis({ blockchain, ownerAddress, populateMetadata }),
  )

  logger.info(`Fetching Ethereum NFTs by owner <${ownerAddress}> on network <${blockchain.networkId}>... OK: ${nfts.length} result(s)`)

  // const hasPools = await Promise.all(nfts.map(async nft => {
  //   const collection = await getCollection({ address: nft.collection.address, blockchain, nftId: nft.id })
  //   return collection !== undefined
  // }))

  return nfts
}

export function useAlchemy({ blockchain, ownerAddress, populateMetadata }: Params): DataSource<NFT[]> {
  return async () => {
    if (blockchain.network !== 'ethereum') throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')

    const apiHost = _.get(appConf.alchemyAPIUrl, blockchain.networkId) ?? rethrow(`Missing Alchemy API URL for blockchain ${JSON.stringify(blockchain)}`)
    const apiKey = appConf.alchemyAPIKey ?? rethrow('Missing Alchemy API key')

    const { ownedNfts: res } = await getRequest(`${apiHost}${apiKey}/getNFTs`, {
      params: {
        owner: ownerAddress,
        withMetadata: populateMetadata,
      },
    })

    if (!_.isArray(res)) rethrow('Bad request or unrecognized payload when fetching NFTs from Alchemy API')

    let nfts: NFT[] = []

    for (let i = 0, n = res.length; i < n; i++) {
      const entry = res[i]
      const tokenId = new BigNumber(_.get(entry, 'id.tokenId')) // IDs from Alchemy are hex strings, convert to integer
      const collectionAddress = _.get(entry, 'contract.address')

      if (!tokenId.isFinite() || collectionAddress === undefined) {
        logger.warn(`Fetching NFTs by owner <${ownerAddress}> using Alchemy API... WARN: Dropping NFT ${JSON.stringify(entry)} due to missing address or token ID`)
        continue
      }

      let metadata = {}

      if (populateMetadata === true) {
        const name = _.get(entry, 'metadata.name')
        const imageUrl = ['media.0.gateway', 'metadata.image', 'metadata.image_url'].reduceRight((prev, curr) => !_.isEmpty(prev) ? prev : _.get(res, curr))

        if (_.isEmpty(name) || _.isEmpty(imageUrl)) {
          const tokenUri = _.get(res, 'tokenUri.gateway')

          try {
            metadata = await composeDataSources(useTokenUri({ tokenUri }), useContract({ blockchain, collectionAddress, nftId: tokenId.toFixed() }))
          }
          catch (err) {
            logger.warn(`Fetching NFTs by owner <${ownerAddress}> using Alchemy API... WARN: NFT ${JSON.stringify(entry)} has missing metadata`)
          }
        }
        else {
          metadata = {
            name,
            imageUrl: !_.isNil(imageUrl) ? normalizeIPFSUri(imageUrl) : undefined,
          }
        }
      }

      nfts.push(NFT.factory({
        id: tokenId.toFixed(),
        collection: Collection.factory({
          address: collectionAddress,
          blockchain,
        }),
        ownerAddress,
        ...metadata,
      }))
    }

    return nfts
  }
}

export function useMoralis({ blockchain, ownerAddress, populateMetadata }: Params): DataSource<NFT[]> {
  return async () => {
    if (blockchain.network !== 'ethereum') throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')

    const apiKey = appConf.moralisAPIKey ?? rethrow('Missing Moralis API key')

    const { result: res } = await getRequest(`https://deep-index.moralis.io/api/v2/${ownerAddress}/nft`, {
      headers: {
        'X-API-Key': apiKey,
      },
      params: {
        chain: 'eth',
        format: 'decimal',
      },
    })

    if (!_.isArray(res)) rethrow('Bad request or unrecognized payload when fetching NFTs from Moralis API')

    let nfts: NFT[] = []

    for (let i = 0, n = res.length; i < n; i++) {
      const entry = res[i]
      const tokenId = _.get(entry, 'token_id')
      const collectionAddress = _.get(entry, 'token_address')

      if (tokenId === undefined || collectionAddress === undefined) {
        logger.warn(`Fetching NFTs by owner <${ownerAddress}> using Moralis API... WARN: dropping NFT ${JSON.stringify(entry)} due to missing address or token ID`)
        continue
      }

      let metadata = {}

      if (populateMetadata === true) {
        const parsed = JSON.parse(_.get(entry, 'metadata'))
        const name = _.get(parsed, 'name')
        const imageUrl = _.get(parsed, 'image')

        if (_.isEmpty(name) || _.isEmpty(imageUrl)) {
          const tokenUri = _.get(res, 'tokenUri.gateway')

          try {
            metadata = await composeDataSources(useTokenUri({ tokenUri }), useContract({ blockchain, collectionAddress, nftId: tokenId.toFixed() }))
          }
          catch (err) {
            logger.warn(`Fetching NFTs by owner <${ownerAddress}> using Alchemy API... WARN: NFT ${JSON.stringify(entry)} has missing metadata`)
          }
        }
        else {
          metadata = {
            name,
            imageUrl: !_.isNil(imageUrl) ? normalizeIPFSUri(imageUrl) : undefined,
          }
        }
      }

      nfts.push(NFT.factory({
        id: tokenId,
        collection: Collection.factory({
          address: collectionAddress,
          blockchain,
        }),
        ownerAddress,
        ...metadata ?? {},
      }))
    }

    return nfts // .sort((a, b) => a.isSupported ? -1 : 1)
  }
}
