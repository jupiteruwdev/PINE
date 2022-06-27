import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { defaultFees } from '../../config/supportedCollections'
import {
  Collection, LoanOption,
  Pool,
} from '../../entities'
import failure from '../../utils/failure'

export function mapCollection(data: Record<string, any>): Collection {
  const address = _.get(data, 'address')
  const networkType = _.get(data, 'networkType')
  const networkId = _.toString(_.get(data, 'networkId'))
  const id = _.get(data, 'id')
  const imageUrl = _.get(data, 'imageUrl')
  const name = _.get(data, 'displayName')

  if (!_.isString(address)) throw TypeError('Failed to map key "address"')
  if (!_.isString(id)) throw TypeError('Failed to map key "id"')
  if (!_.isString(name)) throw TypeError('Failed to map key "name"')
  if (!networkType) throw TypeError('Failed to map key "blockchain"')
  if (!networkId) throw TypeError('Failed to map key "blockchain"')

  return {
    address,
    blockchain: { network: networkType, networkId },
    id,
    imageUrl,
    name,
  }
}

function mapLoanOption(
  data: Record<string, any>,
  version: number,
  poolAddress: string
): LoanOption {
  try {
    const interestBPSPerBlock = new BigNumber(_.get(data, 'interestBpsBlock'))
    const interestBPSPerBlockOverride =
      _.get(data, 'interestBpsBlockOverride') === undefined
        ? undefined
        : new BigNumber(_.get(data, 'interestBpsBlockOverride'))
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

export function mapPool(data: Record<string, any>): Pool {
  const version = _.get(data, 'version')
  const address = _.get(data, 'address')
  const blockchain = _.get(data, 'blockchain')
  const collection = _.get(data, 'collection')
  const loanOptions = _.get(data, 'loanOptions', []).map((t: any) =>
    mapLoanOption(t, version, address)
  )

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
