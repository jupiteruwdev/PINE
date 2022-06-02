import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { defaultFees, supportedCollections } from '../config/supportedCollections'
import getPoolContract from '../core/getPoolContract'
import Blockchain, { AnyBlockchain, EthBlockchain } from '../entities/lib/Blockchain'
import LoanOption from '../entities/lib/LoanOption'
import Pool from '../entities/lib/Pool'
import failure from '../utils/failure'
import mapBlockchainFilterToDict from '../utils/mapBlockchainFilterToDict'
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
  blockchains?: { [K in AnyBlockchain]?: string }
  includeRetired?: boolean
  offset?: number
  count?: number
}

// TODO: remove version param when pool is moved into loan optiom
function mapLoanOption(data: Record<string, any>, version: number, poolAddress: string): LoanOption {
  try {
    const interestBPSPerBlock = new BigNumber(_.get(data, 'interest_bps_block'))
    const interestBPSPerBlockOverride = _.get(data, 'interest_bps_block_override') === undefined ? undefined : new BigNumber(_.get(data, 'interest_bps_block_override'))
    const loanDurationBlocks = _.toNumber(_.get(data, 'loan_duration_block'))
    const loanDurationSeconds = _.toNumber(_.get(data, 'loan_duration_second'))
    const maxLTVBPS = new BigNumber(_.get(data, 'max_ltv_bps'))
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
  const loanOptions = _.get(data, 'loan_options', []).map((t: any) => mapLoanOption(t, version, address))

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
  const rawData = supportedCollections
  const matchedId = _.findKey(rawData, (val, key) => {
    if (collectionId !== undefined && collectionId !== key) return false
    if (collectionAddress !== undefined && _.get(val, 'address')?.toLowerCase() !== collectionAddress.toLowerCase()) return false
    if (_.get(val, 'networkType') !== blockchain.network) return false
    if (_.toString(_.get(val, 'networkId')) !== blockchain.networkId) return false
    if (address !== undefined && !_.get(val, 'lendingPools').some((e: any) => e.address.toLowerCase() === address.toLowerCase())) return false
    return true
  })

  if (!matchedId) return undefined

  const data = rawData[matchedId]

  const collection = collections.mapCollection({
    ...data,
    id: matchedId,
  })

  for (const lendingPool of _.get(data, 'lendingPools', [])) {
    const pool = await getPoolContract({ blockchain, poolAddress: lendingPool.address })
    if (!includeRetired && lendingPool.retired) continue
    return mapPool({
      version: pool.poolVersion,
      ...lendingPool,
      collection,
      blockchain,
    })
  }
}

/**
 * Finds all pools on the platform. If the blockchains filter is specified, only pools residing in
 * the mapped blockchains will be returned. Otherwise if unspecified (i.e. `filter.blockchains` ===
 * `undefined`), all pools of all blockchains in their default network IDs will be returned.
 *
 * @param filter - See {@link FindAllFilter}.
 *
 * @returns Array of pools.
 */
export async function findAll({ collectionAddress, collectionId, blockchains, includeRetired = false, offset = 0, count = 10 }: FindAllFilter = {}): Promise<Pool[]> {
  const keys = _.keys(supportedCollections).slice(offset, offset + count)
  const rawData = _.pickBy(supportedCollections, (value, key) => keys.indexOf(key) >= 0)

  const blockchainDict = blockchains === undefined ? mapBlockchainFilterToDict({}, true) : mapBlockchainFilterToDict(blockchains, false)
  const pools: Pool[] = []

  if (blockchainDict.ethereum) {
    for (const key in rawData) {
      if (!rawData.hasOwnProperty(key)) continue

      if (collectionId !== undefined && collectionId !== key) continue

      const data = rawData[key]

      if (_.get(data, 'networkType') !== blockchainDict.ethereum.network) continue
      if (_.toString(_.get(data, 'networkId')) !== blockchainDict.ethereum.networkId) continue

      const collection = collections.mapCollection({
        ...data,
        id: key,
      })

      if (collectionAddress !== undefined && collectionAddress.toLowerCase() !== collection.address.toLowerCase()) continue

      // identify if multi-pool or single-pool
      for (const lendingPool of _.get(data, 'lendingPools', [])) {
        const pool = await getPoolContract({ blockchain: blockchainDict.ethereum, poolAddress: lendingPool.address })
        if (!includeRetired && lendingPool.retired) continue
        pools.push(mapPool({
          version: pool.poolVersion,
          ...lendingPool,
          collection,
          blockchain: blockchainDict.ethereum,
        }))
      }
    }
  }

  return pools
}
