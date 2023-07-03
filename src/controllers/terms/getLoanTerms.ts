import BigNumber from 'bignumber.js'
import appConf from '../../app.conf'
import { Blockchain, Collection, LoanTerms, NFT, Pool, Value } from '../../entities'
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
    case 'ethereum':
    case 'polygon': {
      // verify collection is valid one with matcher
      await verifyCollectionWithMatcher({ blockchain, collectionAddresses, matchSubcollectionBy: { type: 'nftId', values: nftIds } })
      const pools = await searchPublishedMultiplePools({ addresses: poolAddresses, nftIds, collectionAddresses, blockchainFilter: Blockchain.parseFilter(blockchain), includeInvalidTenors: false })

      if (!pools) throw fault('ERR_NO_POOLS_AVAILABLE')
      if (pools.find(pool => pool.collection.valuation && (pool.collection.valuation?.timestamp || 0) < new Date().getTime() - appConf.valuationLimitation)) {
        throw fault('INVALID_VALUATION_TIMESTAMP')
      }

      const collectionsMetadata = await Promise.all(collectionAddresses.map((collectionAddress, index) => getEthCollectionMetadata({ blockchain, collectionAddress, matchSubcollectionBy: { type: 'poolAddress', value: pools.find(pool => pool.address === collectionAddress)?.address ?? '' } })))
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

      const associatedPools = await Promise.all(pools.map((pool, index) => new Promise<Pool>(async (resolve, reject) => {
        if (pool.collection.valuation) resolve(pool)
        else {
          const valuation = await getEthNFTValuation({ blockchain: blockchain as Blockchain<'ethereum'>, collectionAddress: collectionAddresses[index], nftId: nftIds[index] })
          resolve({
            ...pool,
            collection: {
              ...pool.collection,
              valuation,
            },
          })
        }
      })))

      const loanTerms: LoanTerms[] = []

      for (let i = 0; i < collectionAddresses.length; i++) {
        const collectionPools = associatedPools.filter(pool => collectionAddresses[i].toLowerCase() === pool.collection.address.toLowerCase())
        for (let j = 0; j < collectionPools?.length; j++) {
          if (!(collectionPools[j].ethLimit !== 0 && collectionPools[j].loanOptions.some(option => collectionPools[j].utilization.amount.plus(option.maxBorrow?.amount ?? new BigNumber(0)).gt(new BigNumber(collectionPools[j].ethLimit ?? 0))))) {
            const valuation = collectionPools[j].collection.valuation
            if (valuation?.value?.amount) valuation.value.amount = new BigNumber(valuation?.value?.amount.toFixed(5))
            if (valuation?.value?.amount.isPositive()) {
              try {
                const { signature, issuedAtBlock, expiresAtBlock } = await signValuation({ blockchain, nftId: nftIds[i], collectionAddress: collectionAddresses[i], valuation, poolVersion: collectionPools[j].version })
                const loanTerm: LoanTerms = {
                  routerAddress: collectionPools[j].routerAddress,
                  valuation,
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
              catch (err) {
                logger.info(`Signing valuation error for NFT ID <${nftIds[i]}> and collection address <${collectionAddresses[i]}> on blockchain <${JSON.stringify(blockchain)}>... ERR:`, err)
              }
            }
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

    throw fault('ERR_GET_LOAN_TERMS', undefined, err)
  }
}
