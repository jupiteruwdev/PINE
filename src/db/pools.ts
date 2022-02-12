import _ from 'lodash'
import { supportedCollections } from '../config/supportedCollections'
import Blockchain, { AnyBlockchain, EthBlockchain } from '../entities/Blockchain'
import LoanOption from '../entities/LoanOption'
import Pool from '../entities/Pool'
import * as collections from './collections'

type FindOneFilter = {
  address?: string
  collectionAddress?: string
  collectionId?: string
  blockchain?: Blockchain
}

type FindAllFilter = {
  collectionAddress?: string
  collectionId?: string
  blockchains?: { [K in AnyBlockchain]?: string }
}

function mapLoanOption(data: Record<string, any>): LoanOption {
  const interestBPSPerBlock = _.get(data, 'interest_bps_block')
  const interestBPSPerBlockOverride = _.get(data, 'interest_bps_block_override')
  const loanDurationBlocks = _.get(data, 'loan_duration_block')
  const loanDurationSeconds = _.get(data, 'loan_duration_second')
  const maxLTVBPS = _.get(data, 'max_ltv_bps')

  if (!_.isNumber(interestBPSPerBlock)) throw TypeError('Failed to map key "interestBPSPerBlock"')
  if (interestBPSPerBlockOverride !== undefined && !_.isNumber(interestBPSPerBlockOverride)) throw TypeError('Failed to map key "interestBPSPerBlockOverride"')
  if (!_.isNumber(loanDurationBlocks)) throw TypeError('Failed to map key "loanDurationBlocks"')
  if (!_.isNumber(loanDurationSeconds)) throw TypeError('Failed to map key "loanDurationSeconds"')
  if (!_.isNumber(maxLTVBPS)) throw TypeError('Failed to map key "maxLTVBPS"')

  return {
    'interest_bps_per_block_override': interestBPSPerBlockOverride,
    'interest_bps_per_block': interestBPSPerBlock,
    'loan_duration_block': loanDurationBlocks,
    'loan_duration_seconds': loanDurationSeconds,
    'max_ltv_bps': maxLTVBPS,
  }
}

function mapPool(data: Record<string, any>): Pool {
  const address = _.get(data, 'address')
  const blockchain = _.get(data, 'blockchain')
  const collection = _.get(data, 'collection')
  const loanOptions = _.get(data, 'loan_options', []).map((t: any) => mapLoanOption(t))

  if (!_.isString(address)) throw TypeError('Failed to map key "address"')
  if (!blockchain) throw TypeError('Failed to map key "blockchain"')
  if (!collection) throw TypeError('Failed to map key "collection"')
  if (!loanOptions) throw TypeError('Failed to map key "loanOptions"')

  return {
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
export async function findOne({ address, collectionAddress, collectionId, blockchain = EthBlockchain() }: FindOneFilter = {}): Promise<Pool | undefined> {
  const rawData = supportedCollections
  const matchedId = _.findKey(rawData, (val, key) => {
    if (collectionId !== undefined && collectionId !== key) return false
    if (collectionAddress !== undefined && _.get(val, 'address') !== collectionAddress) return false
    if (_.get(val, 'networkType') !== blockchain.network) return false
    if (_.toString(_.get(val, 'networkId')) !== blockchain.networkId) return false
    if (address !== undefined && _.get(val, 'lendingPool.address') !== address) return false
    return true
  })

  if (!matchedId) return undefined

  const data = rawData[matchedId]

  const collection = collections.mapCollection({
    ...data,
    id: matchedId,
  })

  return mapPool({
    ..._.get(data, 'lendingPool', {}),
    collection,
    blockchain,
  })
}

/**
 * Finds all pools on the platform. If no filters are provided, all pools will be returned in the
 * default networks of all blockchains.
 *
 * @param filter - See {@link FindAllFilter}.
 *
 * @returns Array of pools.
 */
export async function findAll({ collectionAddress, collectionId, blockchains }: FindAllFilter = {}): Promise<Pool[]> {
  const rawData = supportedCollections
  const ethBlockchain = blockchains ? (blockchains.ethereum ? EthBlockchain(blockchains.ethereum) : undefined) : EthBlockchain()

  const pools: Pool[] = []

  if (ethBlockchain) {
    for (const key in rawData) {
      if (!rawData.hasOwnProperty(key)) continue

      if (collectionId !== undefined && collectionId !== key) continue

      const data = rawData[key]

      if (_.get(data, 'networkType') !== ethBlockchain.network) continue
      if (_.toString(_.get(data, 'networkId')) !== ethBlockchain.networkId) continue

      const collection = collections.mapCollection({
        ...data,
        id: key,
      })

      if (collectionAddress !== undefined && collectionAddress !== collectionAddress) continue

      pools.push(mapPool({
        ..._.get(data, 'lendingPool', {}),
        collection,
        blockchain: ethBlockchain,
      }))
    }
  }

  return pools
}
