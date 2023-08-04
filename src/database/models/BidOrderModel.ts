import mongoose from 'mongoose'

const { Schema } = mongoose

const schema = new Schema({
  networkType: Schema.Types.String,
  networkId: Schema.Types.String,
  marketplace: Schema.Types.String,
  nftCollection: {
    type: Schema.Types.ObjectId,
    ref: 'NFTCollection',
  },
  nftId: Schema.Types.String,
  listingTime: Schema.Types.Number,
  expirationTime: Schema.Types.Number,
  bidPrice: Schema.Types.String,
  status: Schema.Types.String,
  orderNonce: Schema.Types.Number,
}, { timestamps: true })

const BidOrderModel = mongoose.model('BidOrder', schema, 'bidOrders')

export default BidOrderModel
