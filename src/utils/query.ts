import { Request } from 'express'
import _ from 'lodash'
import Blockchain, { AnyBlockchain, BlockchainFilter, EthBlockchain, SolBlockchain } from '../entities/lib/Blockchain'
import { parseEthNetworkId } from './ethereum'
import failure from './failure'

/**
 * Searches for and returns a string value from a request query based on the specified key.
 *
 * @param query - The request query to search for key.
 * @param key - The key.
 *
 * @returns The string value.
 *
 * @throws If the string value cannot be found or derived.
 */
export function getString(query: Request['query'], key: string): string {
  const value = _.get(query, key)?.toString()
  if (!value) throw failure('INVALID_QUERY', Error(`Cannot derive string from key "${key}"`))
  return value
}

/**
 * Searches for and returns a number value from a request query based on the specified key.
 *
 * @param query - The request query to search for key.
 * @param key - The key.
 *
 * @returns The number value.
 *
 * @throws If the number value cannot be found or derived.
 */
export function getNumber(query: Request['query'], key: string): number {
  const value = _.get(query, key)?.toString()
  if (_.isEmpty(value)) throw failure('INVALID_QUERY', Error(`Cannot derive number from key "${key}"`))
  return _.toNumber(value)
}

/**
 * Parses a request query to look for and generate a {@link BlockchainFilter} dictionary. This
 * function expects the query to have key-value pairs in "<blockchain name>-<network ID>" format.
 *
 * @param query - The request query to parse.
 * @param autofillDefaults - Specifies if the default network ID of a blockchain should be
 *                           included in the returned dictionary even if it was not specified in
 *                           the query.
 *
 * @returns The {@link BlockchainFilter} dictionary. If no blockchain can be found in the request
 *          query, an empty dictionary is simply returned.
 */
export function getBlockchainFilter<T extends boolean>(query: Request['query'], autofillDefaults: T): T extends true ? Required<BlockchainFilter> : BlockchainFilter
export function getBlockchainFilter<T extends boolean>(query: Request['query'], autofillDefaults: T): Required<BlockchainFilter> | BlockchainFilter {
  const ethBlockchain = _.get(query, 'ethereum', _.get(query, 'eth')) === undefined
    ? autofillDefaults ? EthBlockchain() : undefined
    : EthBlockchain(parseEthNetworkId(query.ethereum))

  const solBlockchain = _.get(query, 'solana', _.get(query, 'sol')) === undefined
    ? autofillDefaults ? SolBlockchain() : undefined
    : SolBlockchain(query.solana?.toString())

  return {
    ethereum: ethBlockchain?.networkId,
    solana: solBlockchain?.networkId,
  }

}

export function getBlockchain(query: Request['query']): Blockchain<AnyBlockchain> {
  const blockchainFilter = _.omitBy(getBlockchainFilter(query, false), value =>
    value === undefined
  )
  if (_.values(blockchainFilter).length > 1) {
    throw failure('AMBIGUOUS_TARGET_BLOCKCHAIN')
  }
  else if (_.values(blockchainFilter).length === 0) {
    return EthBlockchain()
  }

  return {
    network: _.keys(blockchainFilter)[0] as AnyBlockchain,
    networkId: _.values(blockchainFilter)[0],
  }
}
