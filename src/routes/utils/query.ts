import { Request } from 'express'
import _ from 'lodash'
import { AnyBlockchain, Blockchain } from '../../entities'
import fault from '../../utils/fault'

type Query = Request['query']

type Options<Optional> = {
  optional?: Optional
}

/**
 * Searches for and returns a string value from a request query based on the specified key.
 *
 * @param query - The request query to search for key.
 * @param key - The key.
 * @param options - See {@link Options}.
 *
 * @returns The string value.
 *
 * @throws If `optional` is `false` and the string value cannot be found or derived
 */
export function getString<Optional extends boolean = false>(query: Query, key: string, options?: Options<Optional>): Optional extends true ? string | undefined : string
export function getString<Optional extends boolean = false>(query: Query, key: string, { optional }: Options<Optional> = {}): string | undefined {
  const value = _.get(query, key)?.toString()
  if (value === undefined && optional !== true) throw fault('ERR_INVALID_QUERY', `Cannot derive string from key "${key}"`)
  return value
}

/**
 * Searches for and returns a number value from a request query based on the specified key.
 *
 * @param query - The request query to search for key.
 * @param key - The key.
 * @param options - See {@link Options}.
 *
 * @returns The number value.
 *
 * @throws If `optional` is `false` and the number value cannot be found or derived.
 */
export function getNumber<Optional extends boolean = false>(query: Query, key: string, options?: Options<Optional>): Optional extends true ? number | undefined : number
export function getNumber<Optional extends boolean = false>(query: Query, key: string, { optional }: Options<Optional> = {}): number | undefined {
  const value = _.get(query, key)?.toString()

  if (_.isEmpty(value)) {
    if (optional === true) return undefined
    throw fault('ERR_INVALID_QUERY', `Cannot derive number from key "${key}"`)
  }

  const nValue = _.toNumber(value)

  if (_.isNaN(nValue)) throw fault('ERR_INVALID_QUERY', `Invalid number type from key "${key}"`)

  return nValue
}

/**
 * Searches for and returns a boolean value from a request query based on the specified key.
 *
 * @param query - The request query to search for key.
 * @param key - The key.
 * @param options - See {@link Options}.
 *
 * @returns The boolean value.
 *
 * @throws If `optional` is `false` and the boolean value cannot be found or derived.
 */
export function getBoolean<Optional extends boolean = false>(query: Query, key: string, options?: Options<Optional>): Optional extends true ? boolean | undefined : boolean
export function getBoolean<Optional extends boolean = false>(query: Query, key: string, { optional }: Options<Optional> = {}): boolean | undefined {
  const value = _.get(query, key)?.toString()

  switch (value?.toLowerCase()) {
  case 'true':
  case 'yes':
    return true
  case 'false':
  case 'no':
    return false
  default:
    if (optional === true) return undefined
    throw fault('ERR_INVALID_QUERY', `Cannot derive boolean from key "${key}"`)
  }
}

/**
 * Parses a request query to look for and generate a {@link Blockchain.Filter} dictionary. This
 * function expects the query to have key-value pairs in "<blockchain name>-<network ID>" format.
 *
 * @param query - The request query to parse.
 * @param autofillDefaults - Specifies if the default network ID of a blockchain should be
 *                           included in the returned dictionary even if it was not specified in
 *                           the query.
 *
 * @returns The {@link Blockchain.Filter} dictionary. If no blockchain can be found in the request
 *          query, an empty dictionary is simply returned.
 */
export function getBlockchainFilter<T extends boolean>(query: Query, autofillDefaults: T, setDefaultState?: T): T extends true ? Required<Blockchain.Filter> : Blockchain.Filter
export function getBlockchainFilter<T extends boolean>(query: Query, autofillDefaults: T, setDefaultState = true): Required<Blockchain.Filter> | Blockchain.Filter {
  const ethBlockchain = _.get(query, 'ethereum', _.get(query, 'eth')) === undefined
    ? autofillDefaults ? Blockchain.Ethereum() : undefined
    : Blockchain.Ethereum(parseEthNetworkId(query.ethereum))

  const arbBlockchain = _.get(query, 'arbitrum', _.get(query, 'arb')) === undefined
    ? autofillDefaults ? Blockchain.Arbitrum() : undefined
    : Blockchain.Arbitrum(parseEthNetworkId(query.arbitrum))

  const solBlockchain = _.get(query, 'solana', _.get(query, 'sol')) === undefined
    ? autofillDefaults ? Blockchain.Solana() : undefined
    : Blockchain.Solana(query.solana?.toString())

  const polyBlockchain = _.get(query, 'polygon', _.get(query, 'poly')) === undefined
    ? autofillDefaults ? Blockchain.Polygon() : undefined
    : Blockchain.Polygon(parseEthNetworkId(query.polygon))

  return {
    ethereum: ethBlockchain?.networkId,
    solana: solBlockchain?.networkId,
    polygon: polyBlockchain?.networkId,
    arbitrum: arbBlockchain?.networkId,
  }
}

/**
 * Searches for and returns a {@link Blockchain} object from a request query based on the specified
 * key.
 *
 * @param query - The request query to search for key.
 * @param options - See {@link Options}.
 *
 * @returns The {@link Blockchain} object.
 *
 * @throws If `optional` is `false` and the blockchain object cannot be derived.
 */
export function getBlockchain<Optional extends boolean = false>(query: Query, options?: Options<Optional>): Optional extends true ? Blockchain<AnyBlockchain> | undefined : Blockchain<AnyBlockchain>
export function getBlockchain<Optional extends boolean = false>(query: Query, { optional }: Options<Optional> = {}): Blockchain<AnyBlockchain> | undefined {
  const blockchainFilter = _.omitBy(getBlockchainFilter(query, false, false), value => value === undefined)

  if (_.values(blockchainFilter).length > 1) {
    throw fault('ERR_AMBIGUOUS_BLOCKCHAIN', 'Expecting exactly 1 blockchain in query')
  }

  if (_.values(blockchainFilter).length < 1) {
    if (optional === true) return undefined
    throw fault('ERR_NO_BLOCKCHAIN', 'Expecting exactly 1 blockchain in query')
  }

  return {
    network: _.keys(blockchainFilter)[0] as AnyBlockchain,
    networkId: _.values(blockchainFilter)[0],
  }
}

function parseEthNetworkId(value: any): string {
  return _.toString(_.toNumber(value))
}
