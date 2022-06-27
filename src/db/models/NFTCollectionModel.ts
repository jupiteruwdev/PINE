import mongoose, { Schema } from 'mongoose'

const schema = new Schema({
  _id: Schema.Types.ObjectId,
  vendorIds: {
    opensea: Schema.Types.String,
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
