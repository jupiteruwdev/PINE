/**
 * @todo Use proper db.
 */

import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { defaultFees } from '../config/supportedCollections'
import getPoolContract from '../core/getPoolContract'
import { Blockchain, BlockchainFilter, EthBlockchain, EthereumNetwork, LoanOption, Pool, SolanaNetwork } from '../entities'
import PoolModel from '../models/pool'
import failure from '../utils/failure'

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

  const filter: Record<string, any>[] = [{
    'collection.networkType': blockchain.network,
  },
  {
    'collection.networkId': parseInt(blockchain.networkId, 10),
  }]

  if (collectionAddress !== undefined) {
    filter.push({
      'collection.address': collectionAddress,
    })
  }

  if (collectionId !== undefined) {
    const matches = collectionId.match(/(.*):(.*)/)
    const venue = matches?.[1]
    const id = matches?.[2] ?? ''
    filter.push({
      [`collection.${venue}`]: id,
    })
  }

  if (address !== undefined) {
    filter.push({
      address,
    })
  }

  if (address === undefined && !includeRetired) {
    filter.push({
      'retired': {
        $ne: true,
      },
    })
  }

  const poolsData = await PoolModel.aggregate([
    {
      $lookup: {
        from: 'nftCollections',
        localField: 'nftCollection',
        foreignField: '_id',
        as: 'collection',
      },
    },
    {
      $match: {
        $and: filter,
      },
    }]).exec()

  for (const pool of poolsData) {
    const poolContract = await getPoolContract({ blockchain, poolAddress: pool.address })
    return mapPool({
      version: poolContract.poolVersion,
      ...pool,
      collection: pool.collection,
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

    const filter: Record<string, any>[] = [{
      'collection.networkType': blockchain.network,
    },
    {
      'collection.networkId': parseInt(blockchain.networkId, 10),
    }]

    if (collectionAddress !== undefined) {
      filter.push({
        'collection.address': collectionAddress,
      })
    }

    if (collectionId !== undefined) {
      const matches = collectionId.match(/(.*):(.*)/)
      const venue = matches?.[1]
      const id = matches?.[2] ?? ''
      filter.push({
        [`collection.${venue}`]: id,
      })
    }

    if (!includeRetired) {
      filter.push({
        'retired': {
          $ne: true,
        },
      })
    }

    const poolsData = await PoolModel.aggregate([
      {
        $lookup: {
          from: 'nftCollections',
          localField: 'nftCollection',
          foreignField: '_id',
          as: 'collection',
        },
      },
      {
        $match: {
          $and: filter,
        },
      }]).exec()

    for (const pool of poolsData) {
      const poolContract = await getPoolContract({ blockchain, poolAddress: pool.address })
      pools.push(mapPool({
        version: poolContract.poolVersion,
        ...pool,
        collection: pool.collection,
        blockchain,
      }))
    }
  }

  return !_.isNil(offset) && !_.isNil(count) ? pools.slice(offset, offset + count) : pools
}
