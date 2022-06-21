import mongoose from 'mongoose'
const { Schema } = mongoose

const schema = new Schema({
  _id: Schema.Types.ObjectId,
  vendorIds: {
    opensea: Schema.Types.String,
  },
  displayName: Schema.Types.String,
  address: Schema.Types.String,
  networkType: Schema.Types.String,
  networkId: Schema.Types.Number,
  imageUrl: Schema.Types.String,
  lendingPools: [{
    type: Schema.Types.ObjectId,
    ref: 'pool',
  }],
})

const CollectionModel = mongoose.model('nftCollection', schema, 'nftCollections')

export default CollectionModel
