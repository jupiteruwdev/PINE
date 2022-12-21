import BigNumber from 'bignumber.js'
import appConf from '../../app.conf'
import { AnyCurrency, Blockchain, Collection, LoanTerms, NFT, Valuation, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getEthNFTMetadata } from '../collaterals'
import { getEthCollectionMetadata, verifyCollectionWithMatcher } from '../collections'
import searchPublishedMultiplePools from '../pools/searchPublishedMultiplePools'
import { getEthNFTValuation, signValuation } from '../valuations'

type Params = {
  blockchain: Blockchain
  collectionAddresses: string[]
  poolAddresses?: string[]
  nftIds: string[]
}

export default async function getLoanTerms({ blockchain, collectionAddresses, nftIds, poolAddresses }: Params): Promise<LoanTerms[]> {
  logger.info(`Fetching loan terms for NFT ID <${nftIds.join(',')}> and collection Address <${collectionAddresses.join(',')}> on blockchain <${JSON.stringify(blockchain)}>...`)

  try {
    switch (blockchain.network) {
    case 'ethereum': {
      // verify collection is valid one with matcher
      await verifyCollectionWithMatcher({ blockchain, collectionAddresses, matchSubcollectionBy: { type: 'nftId', values: nftIds } })
      const pools = await searchPublishedMultiplePools({ addresses: poolAddresses, nftIds, collectionAddresses, blockchainFilter: {
        ethereum: blockchain.networkId,
      } })

      if (!pools) throw fault('ERR_NO_POOLS_AVAILABLE')
      if (pools.find(pool => pool.collection.valuation && (pool.collection.valuation?.timestamp || 0) < new Date().getTime() - appConf.valuationLimitation)) {
        throw fault('INVALID_VALUATION_TIMESTAMP')
      }

      const collectionsMetadata = await Promise.all(pools.map((pool, index) => getEthCollectionMetadata({ blockchain, collectionAddress: collectionAddresses[index], matchSubcollectionBy: { type: 'poolAddress', value: pool.address } })))
      const nftsMetadata = await Promise.all(collectionAddresses.map((collectionAddress, index) => getEthNFTMetadata({ blockchain, collectionAddress, nftId: nftIds[index] })))

      const nfts: NFT[] = []

      for (let i = 0; i < collectionAddresses.length; i++) {
        const collectionAddress = collectionAddresses[i]
        nfts.push({
          collection: Collection.factory({
            address: collectionAddress,
            blockchain,
            ...collectionsMetadata[i],
          }),
          id: nftIds[i],
          ...nftsMetadata[i],
        })
      }

      const valuations = await Promise.all(pools.map((pool, index) => new Promise<Valuation<AnyCurrency>>(async (resolve, reject) => {
        if (pool.collection.valuation) resolve(pool.collection.valuation)
        else {
          const valuation = await getEthNFTValuation({ blockchain: blockchain as Blockchain<'ethereum'>, collectionAddress: collectionAddresses[index], nftId: nftIds[index] })
          resolve(valuation)
        }
      })))

      const loanTerms: LoanTerms[] = []

      for (let i = 0; i < collectionAddresses.length; i++) {
        const collectionPools = pools.filter(pool => collectionAddresses[i].toLowerCase() === pool.collection.address.toLowerCase())
        for (let j = 0; j < collectionPools?.length; j++) {
          if (!(collectionPools[j].ethLimit !== 0 && collectionPools[j].loanOptions.some(option => collectionPools[j].utilization.amount.plus(option.maxBorrow?.amount ?? new BigNumber(0)).gt(new BigNumber(collectionPools[j].ethLimit ?? 0))))) {
            const { signature, issuedAtBlock, expiresAtBlock } = await signValuation({ blockchain, nftId: nftIds[i], collectionAddress: collectionAddresses[i], valuation: valuations[j] })

            const loanTerm: LoanTerms = {
              routerAddress: collectionPools[j].routerAddress,
              valuation: valuations[j],
              signature,
              options: collectionPools[j].loanOptions,
              nft: nfts[i],
              issuedAtBlock,
              expiresAtBlock,
              poolAddress: collectionPools[j].address,
              collection: nfts[i].collection,
            }
            loanTerm.options.map(option => {
              option.maxBorrow = Value.$ETH(option.maxLTVBPS.div(10_000).times(loanTerm.valuation.value?.amount ?? 0).toFixed(appConf.ethMaxDecimalPlaces, BigNumber.ROUND_DOWN))
            })

            loanTerms.push(loanTerm)

            logger.info(`Fetching loan terms for NFT ID <${nftIds[i]}> and collection address <${collectionAddresses[i]}> on blockchain <${JSON.stringify(blockchain)}>... OK`)
            logger.debug(JSON.stringify(loanTerm, undefined, 2))
            break
          }
        }
      }

      return loanTerms
    }
    default:
      throw fault('ERR_UNSUPPORTED_BLOCKCHAIN')
    }
  }
  catch (err) {
    logger.error(`Fetching loan terms for NFT ID <${nftIds}> and collection address <${collectionAddresses}> on blockchain <${JSON.stringify(blockchain)}>... ERR`)
    if (logger.isErrorEnabled() && !logger.silent) console.error(err)

    throw err
  }
}
