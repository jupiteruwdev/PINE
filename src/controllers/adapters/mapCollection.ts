import _ from 'lodash'
import { Collection, Valuation } from '../../entities'
import fault from '../../utils/fault'

export default function mapCollection(data: Record<string, any>): Collection {
  try {
    const address = _.get(data, 'address')
    const networkType = _.get(data, 'networkType')
    const networkId = _.toString(_.get(data, 'networkId'))
    const vendorIds = _.get(data, 'vendorIds')
    const imageUrl = _.get(data, 'imageUrl')
    const name = _.get(data, 'displayName')
    const valuation = _.get(data, 'valuation')
    const verified = _.get(data, 'verified', false)
    const sftMarketId = _.get(data, 'sftMarketId')
    const sftDenomination = _.get(data, 'sftDenomination')
    const sftMarketName = _.get(data, 'sftMarketName')
    const type = _.get(data, 'type')
    const hidden = _.get(data, 'hidden')

    if (!_.isString(address)) throw TypeError('Failed to map key "address"')
    if (!_.isString(name)) throw TypeError('Failed to map key "name"')
    if (!networkType) throw TypeError('Failed to map key "blockchain"')
    if (!networkId) throw TypeError('Failed to map key "blockchain"')

    return Collection.factory({
      address,
      blockchain: { network: networkType, networkId },
      vendorIds,
      imageUrl,
      name,
      valuation: valuation ? Valuation.factory(valuation) : undefined,
      verified,
      sftMarketId,
      sftDenomination,
      sftMarketName,
      type,
      hidden,
    })
  }
  catch (err) {
    throw fault('ERR_MAP_COLLECTION', undefined, err)
  }
}
