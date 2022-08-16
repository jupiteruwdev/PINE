import BigNumber from 'bignumber.js'
import _ from 'lodash'
import { Fee, LoanOption, Pool } from '../../entities'
import fault from '../../utils/fault'
import mapCollection from './mapCollection'

function mapLoanOption(
  data: Record<string, any>,
  defaultFees: Fee[]
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

    return LoanOption.factory({
      interestBPSPerBlockOverride,
      interestBPSPerBlock,
      loanDurationBlocks,
      loanDurationSeconds,
      maxLTVBPS,
      fees: defaultFees,
    })
  }
  catch (err) {
    throw fault('ERR_PARSE_LOAN_OPTION_FAILURE', undefined, err)
  }
}

export default function mapPool(data: Record<string, any>): Pool {
  const version = _.get(data, 'poolVersion')
  const address = _.get(data, 'address')
  const networkType = _.get(data, 'networkType', 'ethereum')
  const networkId = _.get(data, 'networkId', '1')
  const collection = mapCollection(_.get(data, 'collection'))
  const routerAddress = _.get(data, 'routerAddress')
  const repayRouterAddress = _.get(data, 'repayRouterAddress')
  const rolloverAddress = _.get(data, 'rolloverAddress')
  const defaultFees = _.get(data, 'defaultFees')
  const ethLimit = _.toNumber(_.get(data, 'ethLimit', 0))
  const lenderAddress = _.get(data, 'lenderAddress', '')
  const published = _.get(data, 'published', true)
  const loanOptions = _.get(data, 'loanOptions', []).map((t: any) =>
    mapLoanOption(t, defaultFees)
  )

  if (!_.isString(address)) throw TypeError('Failed to map key "address"')
  if (!networkType) throw TypeError('Failed to map key "networkType"')
  if (!networkId) throw TypeError('Failed to map key "networkId"')
  if (!collection) throw TypeError('Failed to map key "collection"')
  if (!loanOptions) throw TypeError('Failed to map key "loanOptions"')
  if (!_.isString(routerAddress)) throw TypeError('Failed to map key "routerAddress"')
  if (!_.isString(repayRouterAddress)) throw TypeError('Failed to map key "repayRouterAddress"')
  if (!_.isString(rolloverAddress)) throw TypeError('Failed to map key "rolloverAddress"')
  if (!defaultFees) throw TypeError('Failed to map key "defaultFees"')

  return Pool.factory({
    version,
    address,
    blockchain: { network: networkType, networkId },
    collection,
    loanOptions,
    routerAddress,
    lenderAddress,
    repayRouterAddress,
    rolloverAddress,
    ethLimit,
    published,
  })
}
