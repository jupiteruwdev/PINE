import mongoose from 'mongoose'

const { Schema } = mongoose

const schema = new Schema({
  vendorIds: {
    opensea: Schema.Types.String,
    gemxyz: Schema.Types.String,
    stepn: Schema.Types.String,
    zyte: Schema.Types.String,
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
  valuation: {
    value24Hr: {
      amount: Schema.Types.Decimal128,
      currency: Schema.Types.String,
    },
    value: {
      amount: Schema.Types.Decimal128,
      currency: Schema.Types.String,
    },
    lastValue: {
      amount: Schema.Types.Decimal128,
      currency: Schema.Types.String,
    },
    timestamp: Schema.Types.Number,
  },
  networkType: Schema.Types.String,
  networkId: Schema.Types.String,
  imageUrl: Schema.Types.String,
  sftMarketId: Schema.Types.String,
  verified: Schema.Types.Boolean,
}, { timestamps: true })

schema.index({ address: 1, networkType: 1, networkId: 1 })

const NFTCollectionModel = mongoose.model('NFTCollection', schema, 'nftCollections')

export default NFTCollectionModel
