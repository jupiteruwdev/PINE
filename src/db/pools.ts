/**
 * @todo Use proper db.
 */

import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { defaultFees } from '../config/supportedCollections'
import getPoolContract from '../core/getPoolContract'
import { Blockchain, BlockchainFilter, EthBlockchain, EthereumNetwork, LoanOption, Pool, SolanaNetwork } from '../entities'
import failure from '../utils/failure'
import * as collections from './collections'

type FindOneFilter = {
  address?: string
  collectionAddress?: string
  collectionId?: string
  blockchain?: Blockchain
  includeRetired?: boolean
}

type FindAllFilter = {
  collectionAddress?: string
  collectionId?: string
  blockchainFilter?: BlockchainFilter
  includeRetired?: boolean
  offset?: number
  count?: number
}

// TODO: remove version param when pool is moved into loan optiom
function mapLoanOption(data: Record<string, any>, version: number, poolAddress: string): LoanOption {
  try {
    const interestBPSPerBlock = new BigNumber(_.get(data, 'interestBpsBlock'))
    const interestBPSPerBlockOverride = _.get(data, 'interestBpsBlockOverride') === undefined ? undefined : new BigNumber(_.get(data, 'interestBpsBlockOverride'))
    const loanDurationBlocks = _.toNumber(_.get(data, 'loanDurationBlock'))
    const loanDurationSeconds = _.toNumber(_.get(data, 'loanDurationSecond'))
    const maxLTVBPS = new BigNumber(_.get(data, 'maxLtvBps'))
    const fees = defaultFees('ETH', version, poolAddress)

    return {
      interestBPSPerBlockOverride,
      interestBPSPerBlock,
      loanDurationBlocks,
      loanDurationSeconds,
      maxLTVBPS,
      fees,
    }
  }
  catch (err) {
    throw failure('PARSE_LOAN_OPTION_FAILURE', err)
  }
}

function mapPool(data: Record<string, any>): Pool {
  const version = _.get(data, 'version')
  const address = _.get(data, 'address')
  const blockchain = _.get(data, 'blockchain')
  const collection = _.get(data, 'collection')
  const loanOptions = _.get(data, 'loanOptions', []).map((t: any) => mapLoanOption(t, version, address))

  if (!_.isString(address)) throw TypeError('Failed to map key "address"')
  if (!blockchain) throw TypeError('Failed to map key "blockchain"')
  if (!collection) throw TypeError('Failed to map key "collection"')
  if (!loanOptions) throw TypeError('Failed to map key "loanOptions"')

  return {
    version,
    address,
    blockchain,
    collection,
    loanOptions,
  }
}

/**
 * Finds one supported pool on the platform based on the specified filter.
 *
 * @param filter - See {@link FindOneFilter}.
 *
 * @returns The pool if there is a match, `undefined` otherwise.
 */
export async function findOne({ address, collectionAddress, collectionId, blockchain = EthBlockchain(), includeRetired = false }: FindOneFilter = {}): Promise<Pool | undefined> {
  const collection = await collections.findOneOrigin({ address: collectionAddress, blockchain, id: collectionId, poolAddress: address })
  if (collection === undefined) return undefined

  const collectionMap = collections.mapCollection({
    ...collection,
    id: collections.getCollectionVendorId(collection),
  })

  if (address) {
    for (const lendingPool of _.get(collection, 'lendingPools', [])) {
      if (lendingPool.address.toLowerCase() === address.toLowerCase()) {
        const pool = await getPoolContract({ blockchain, poolAddress: lendingPool.address })
        return mapPool({
          version: pool.poolVersion,
          ...lendingPool,
          collection: collectionMap,
          blockchain,
        })
      }
    }
  }
  for (const lendingPool of _.get(collection, 'lendingPools', [])) {
    const pool = await getPoolContract({ blockchain, poolAddress: lendingPool.address })
    if (!includeRetired && lendingPool.retired) continue
    return mapPool({
      version: pool.poolVersion,
      ...lendingPool,
      collection: collectionMap,
      blockchain,
    })
  }
}

/**
 * Finds all pools on the platform. If the blockchain filter is specified, only pools residing in
 * the filtered blockchains will be returned.
 *
 * @param filter - See {@link FindAllFilter}.
 *
 * @returns Array of pools.
 */
export async function findAll({ collectionAddress, collectionId, blockchainFilter = { ethereum: EthereumNetwork.MAIN, solana: SolanaNetwork.MAINNET }, includeRetired = false, offset, count }: FindAllFilter = {}): Promise<Pool[]> {
  const pools: Pool[] = []

  if (blockchainFilter.ethereum !== undefined) {
    const blockchain = EthBlockchain(blockchainFilter.ethereum)
    const collectionData = await collections.findAllOrigin({ blockchainFilter })

    for (const collection of collectionData) {
      const vendorId = collections.getCollectionVendorId(collection)
      const collectionMap = collections.mapCollection({
        ...collection,
        id: vendorId,
      })

      if (collectionAddress !== undefined && collectionAddress.toLowerCase() !== collection.address.toLowerCase()) continue
      if (collectionId !== undefined && collectionId !== vendorId) continue

      // identify if multi-pool or single-pool
      for (const lendingPool of _.get(collection, 'lendingPools', [])) {
        const pool = await getPoolContract({ blockchain, poolAddress: lendingPool.address })
        if (!includeRetired && lendingPool.retired) continue
        pools.push(mapPool({
          version: pool.poolVersion,
          ...lendingPool,
          collection: collectionMap,
          blockchain,
        }))
      }
    }
  }

  return !_.isNil(offset) && !_.isNil(count) ? pools.slice(offset, offset + count) : pools
}
