import mongoose from 'mongoose'

const { Schema } = mongoose

const schema = new Schema({
  vendorIds: {
    opensea: Schema.Types.String,
    gemxyz: Schema.Types.String,
    stepn: Schema.Types.String,
  },
  matcher: { // if matcher is empty !matcher === true then any token can match
    fieldPath: Schema.Types.String, // for use in _.get(), e.g. token_id, or metadata.name
    regex: Schema.Types.String, // e.g. ([1-9]|[1-9][0-9]|[1-9][0-9][0-9]|[1-9][0-9][0-9][0-9]) for number ranges, or $d{4}.eth^ for digit match
  },
  displayName: Schema.Types.String,
  address: {
    type: Schema.Types.String,
    unique: true,
  },
  networkType: Schema.Types.String,
  networkId: Schema.Types.Number,
  imageUrl: Schema.Types.String,
}, { timestamps: true })

schema.index({ address: 1, networkType: 1, networkId: 1 })

const NFTCollectionModel = mongoose.model('NFTCollection', schema, 'nftCollections')

export default NFTCollectionModel
