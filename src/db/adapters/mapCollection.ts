import _ from 'lodash'
import { Collection } from '../../entities'

function getCollectionVendorId(data: Record<string, any>): string {
  const vendorIds = _.get(data, 'vendorIds')
  return `${_.keys(vendorIds)[0]}:${_.values(vendorIds)[0]}`
}

export default function mapCollection(data: Record<string, any>): Collection {
  const address = _.get(data, 'address')
  const networkType = _.get(data, 'networkType')
  const networkId = _.toString(_.get(data, 'networkId'))
  const vendorIds = _.get(data, 'vendorIds')
  const imageUrl = _.get(data, 'imageUrl')
  const name = _.get(data, 'displayName')

  if (!_.isString(address)) throw TypeError('Failed to map key "address"')
  if (!_.isString(name)) throw TypeError('Failed to map key "name"')
  if (!networkType) throw TypeError('Failed to map key "blockchain"')
  if (!networkId) throw TypeError('Failed to map key "blockchain"')
  // if (!vendorIds) throw TypeError('Failed to map key "vendorIds"')

  return {
    address,
    blockchain: { network: networkType, networkId },
    vendorIds,
    imageUrl,
    name,
  }
}