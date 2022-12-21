import BigNumber from 'bignumber.js'
import appConf from '../../app.conf'
import { AnyCurrency, Blockchain, Collection, NFT, RolloverTerms, Valuation, Value } from '../../entities'
import fault from '../../utils/fault'
import logger from '../../utils/logger'
import { getEthNFTMetadata } from '../collaterals'
import { verifyCollectionWithMatcher } from '../collections'
import { isLoanExtendable } from '../loans'
import searchPublishedMultiplePools from '../pools/searchPublishedMultiplePools'
import { getEthNFTValuation, signValuation } from '../valuations'
import getFlashLoanSource from './getFlashLoanSource'

type Params = {
  blockchain: Blockchain
  collectionAddresses: string[]
  nftIds: string[]
  poolAddresses?: string[]
}

export default async function getRolloverTerms({
  blockchain,
  collectionAddresses,
  nftIds,
  poolAddresses,
}: Params): Promise<RolloverTerms[]> {
  logger.info(`Fetching rollover terms for NFT ID <${nftIds.join(',')}> and collection address <${collectionAddresses.join(',')}> on blockchain <${JSON.stringify(blockchain)}>...`)

  try {
    switch (blockchain.network) {
    case 'ethereum': {
      // verify collection is valid one with matcher
      await verifyCollectionWithMatcher({ blockchain, collectionAddresses, matchSubcollectionBy: { type: 'nftId', values: nftIds } })
      const canRollover = await Promise.all(collectionAddresses.map((collectionAddress, index) => isLoanExtendable({ blockchain, collectionAddress, nftId: nftIds[index] })))
      if (canRollover.find(cR => !cR)) throw fault('ERR_INVALID_ROLLOVER')

      const pools = await searchPublishedMultiplePools({ addresses: poolAddresses, collectionAddresses, blockchainFilter: {
        ethereum: blockchain.networkId,
      } })
      if (!pools) throw fault('ERR_NO_POOLS_AVAILABLE')
      if (pools.find(pool => pool.collection.valuation && (pool.collection.valuation?.timestamp || 0) < new Date().getTime() - appConf.valuationLimitation)) {
        throw fault('INVALID_VALUATION_TIMESTAMP')
      }

      const flashLoanSources = await Promise.all(pools.map(pool => getFlashLoanSource({ blockchain, poolAddress: pool.address })))

      const nftsMetadata = await Promise.all(collectionAddresses.map((collectionAddress, index) => getEthNFTMetadata({ blockchain, collectionAddress, nftId: nftIds[index] })))

      const nfts: NFT[] = []
      for (let i = 0; i < collectionAddresses.length; i++) {
        nfts.push({
          collection: Collection.factory({ address: collectionAddresses[i], blockchain }),
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
      const loanTerms: RolloverTerms[] = []
      for (let i = 0; i < collectionAddresses.length; i++) {
        const collectionPools = pools.filter(pool => collectionAddresses[i].toLowerCase() === pool.collection.address.toLowerCase())
        for (let j = 0; j < collectionPools?.length; j++) {
          if (!(collectionPools[j].ethLimit !== 0 && collectionPools[j].loanOptions.some(option => collectionPools[j].utilization.amount.plus(option.maxBorrow?.amount ?? new BigNumber(0)).gt(new BigNumber(collectionPools[j].ethLimit ?? 0))))) {
            const { signature, issuedAtBlock, expiresAtBlock } = await signValuation({ blockchain, nftId: nftIds[i], collectionAddress: collectionAddresses[i], valuation: valuations[j] })

            const loanTerm = RolloverTerms.factory({
              routerAddress: collectionPools[j].rolloverAddress,
              flashLoanSourceContractAddress: flashLoanSources?.[j].address,
              maxFlashLoanValue: flashLoanSources?.[j].capacity,
              valuation: valuations[j],
              signature,
              options: collectionPools[j].loanOptions,
              nft: nfts[i],
              issuedAtBlock,
              expiresAtBlock,
              poolAddress: collectionPools[j].address,
              collection: nfts[i].collection,
            })

            loanTerm.options.map(option => {
              option.maxBorrow = Value.$ETH(option.maxLTVBPS.div(10_000).times(loanTerm.valuation.value?.amount ?? 0).toFixed(appConf.ethMaxDecimalPlaces, BigNumber.ROUND_DOWN))
              option.fees = [
                {
                  type: 'percentage',
                  value: 0.0035,
                },
              ]
            })

            loanTerms.push(loanTerm)
            logger.info(`Fetching rollover terms for NFT ID <${nftIds[i]}> and collection address <${collectionAddresses[i]}> on blockchain <${JSON.stringify(blockchain)}>... OK:`, loanTerms)

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
    logger.error(`Fetching rollover terms for NFT ID <${nftIds.join(',')}> and collection address <${collectionAddresses.join(',')}> on blockchain <${JSON.stringify(blockchain)}>... ERR:`, err)

    throw err
  }
}
