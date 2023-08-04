import mongoose from 'mongoose'

const { Schema } = mongoose

const schema = new Schema({
  borrowerAddress: Schema.Types.String,
  lenderAddress: Schema.Types.String,
  borrowAmount: Schema.Types.Number,
  collectionAddress: Schema.Types.String,
  collateralPrice: {
    amount: Schema.Types.String,
    currency: Schema.Types.String,
  },
  nftId: Schema.Types.String,
  networkType: Schema.Types.String,
  networkId: Schema.Types.String,
  blockNumber: Schema.Types.Number,
}, { timestamps: true })

const BorrowSnapshotModel = mongoose.model('BorrowSnapshot', schema, 'borrowSnapshots')

export default BorrowSnapshotModel
