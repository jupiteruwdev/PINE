import _ from 'lodash'
import appConf from '../../app.conf'
import { Blockchain, Collection, NFT } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { convertToMoralisChain } from '../../utils/moralis'
import rethrow from '../../utils/rethrow'
import { populateEthCollectionMetadataForNFTs } from '../collections'
import populatePoolAvailabilityForNFTs from '../pools/populatePoolAvailabilityForNFTs'
import DataSource from '../utils/DataSource'
import getRequest from '../utils/getRequest'
import normalizeIPFSUri from '../utils/normalizeIPFSUri'
import { useReservoirUserTokens } from '../utils/useReservoirAPI'
import { useContract, useTokenUri } from './getEthNFTMetadata'

type Params = {
  blockchain: Blockchain
  ownerAddress: string
  populateMetadata: boolean
  collectionAddress?: string
}

export default async function getEthNFTsByOwner({ blockchain, ownerAddress, populateMetadata, collectionAddress }: Params): Promise<NFT[]> {
  try {
    if (!Blockchain.isEVMChain(blockchain)) rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

    logger.info(`Fetching Ethereum NFTs by owner <${ownerAddress}> on network <${blockchain.networkId}>...`)

    let nfts = await DataSource.fetch(
      useReservoir({ blockchain, ownerAddress, populateMetadata }),
      // useMoralis({ blockchain, ownerAddress, populateMetadata }),
    )

    logger.info(`Fetching Ethereum NFTs by owner <${ownerAddress}> on network <${blockchain.networkId}>... OK: ${nfts.length} result(s)`)

    if (populateMetadata === true) {
      nfts = await populateEthCollectionMetadataForNFTs({ blockchain, nfts })
    }

    const populatedNfts = await populatePoolAvailabilityForNFTs({ nfts, blockchain })

    return _.sortBy(populatedNfts.filter(nft => nft.hasPools), [
      nft => nft.hasPools !== true,
      nft => nft.collection.name?.toLowerCase(),
    ])
  }
  catch (err) {
    throw fault('GET_ETH_NFTS_BY_OWNER', undefined, err)
  }
}

export function useReservoir({ blockchain, ownerAddress, populateMetadata }: Params): DataSource<NFT[]> {
  return async () => {
    try {
      logger.info(`...using Reservoir to look up NFTs for owner <${ownerAddress}>`)

      if (!Blockchain.isEVMChain(blockchain)) rethrow(`Unsupported blockchain <${JSON.stringify(blockchain)}>`)

      const res = []

      let continuation: string | undefined

      const collectionSetId = _.get(appConf.reservoirCollectionSetId, blockchain.networkId)

      do {
        const tokensData = await useReservoirUserTokens({ ownerAddress, blockchain, collectionSetId, continuation })

        continuation = _.get(tokensData, 'continuation')
        const tokens = _.get(tokensData, 'tokens')

        res.push(...tokens)
      } while (continuation)

      const unsanitizedNFTs = await Promise.all(res.map(async entry => {
        const tokenId = _.get(entry, 'token.tokenId')
        const collectionAddress = _.get(entry, 'token.contract')

        if (tokenId === undefined || collectionAddress === undefined) {
          logger.warn(`...using Reservoir to look up NFTs for owner <${ownerAddress}>... WARN: Dropping NFT ${JSON.stringify(entry)} due to missing address or token ID`)
          return undefined
        }

        let metadata = {}

        if (populateMetadata === true) {
          logger.warn(`...inferring metadata for NFT <${collectionAddress}/${tokenId}>`)

          const name = _.get(entry, 'token.name', '')
          const imageUrl = _.get(entry, 'token.image')

          metadata = {
            name,
            imageUrl: !_.isNil(imageUrl) ? normalizeIPFSUri(imageUrl) : undefined,
          }
        }

        return NFT.factory({
          id: tokenId,
          collection: Collection.factory({
            address: collectionAddress,
            blockchain,
          }),
          ownerAddress,
          ...metadata,
        })
      }))

      const nfts = _.compact(unsanitizedNFTs)

      return nfts
    }
    catch (err) {
      throw fault('GET_ETH_NFTS_BY_OWNER_USE_RESERVOIR', undefined, err)
    }
  }
}

export function useMoralis({ blockchain, ownerAddress, populateMetadata }: Params): DataSource<NFT[]> {
  return async () => {
    try {
      logger.info(`...using Moralis to look up NFTs for owner <${ownerAddress}>`)
      if (!Blockchain.isEVMChain(blockchain)) throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')

      const apiKey = appConf.moralisAPIKey ?? rethrow('Missing Moralis API key')
      const res = []

      let currCursor

      while (true) {
        const { result: partialRes, cursor }: any = await getRequest(`https://deep-index.moralis.io/api/v2/${ownerAddress}/nft`, {
          headers: {
            'X-API-Key': apiKey,
          },
          params: {
            chain: convertToMoralisChain(blockchain.networkId),
            format: 'decimal',
            cursor: currCursor,
          },
        }).catch(err => rethrow(`Failed to fetch NFTs for owner <${ownerAddress}> using Moralis: ${err}`))

        if (!_.isArray(partialRes)) rethrow('Bad request or unrecognized payload when fetching NFTs from Moralis API')
        res.push(...partialRes)

        if (_.isNil(cursor)) break
        currCursor = cursor
      }

      const unsanitizedNFTs = await Promise.all(res.map(async entry => {
        const tokenId = _.get(entry, 'token_id')
        const collectionAddress = _.get(entry, 'token_address')

        if (tokenId === undefined || collectionAddress === undefined) {
          logger.warn(`...using Moralis to look up NFTs for owner <${ownerAddress}>... WARN: dropping NFT ${JSON.stringify(entry)} due to missing address or token ID`)
          return undefined
        }

        let metadata = {}

        if (populateMetadata === true) {
          logger.warn(`...inferring metadata for NFT <${collectionAddress}/${tokenId}>`)

          const parsed = JSON.parse(_.get(entry, 'metadata'))
          const name = _.get(parsed, 'name') ?? undefined
          const imageUrl = _.get(parsed, 'image') ?? undefined

          if (_.isEmpty(name) && _.isEmpty(imageUrl)) {

            const tokenUri = _.get(entry, 'token_uri')

            try {
              metadata = await DataSource.fetch(
                useTokenUri({ tokenUri }),
                useContract({ blockchain, collectionAddress, nftId: tokenId }),
              )

              logger.info(`...fetching metadata for NFT <${collectionAddress}/${tokenId}>... OK`)
              logger.debug(metadata)
            }
            catch (err) {
              logger.warn(`...fetching metadata for NFT <${collectionAddress}/${tokenId}>... WARN`)
              if (logger.isWarnEnabled() && !logger.silent) console.warn(err)
            }
          }
          else {
            metadata = {
              name,
              imageUrl: !_.isNil(imageUrl) ? normalizeIPFSUri(imageUrl) : undefined,
            }

            logger.info(`...fetching metadata for NFT <${collectionAddress}/${tokenId}>... OK`)
            logger.debug(JSON.stringify(metadata, undefined, 2))
          }
        }

        return NFT.factory({
          id: tokenId,
          collection: Collection.factory({
            address: collectionAddress,
            blockchain,
          }),
          ownerAddress,
          ...metadata,
        })
      }))

      const nfts = _.compact(unsanitizedNFTs)

      return nfts
    }
    catch (err) {
      throw fault('GET_ETH_NFTS_BY_OWNER_USE_MORALIS', undefined, err)
    }
  }
}
