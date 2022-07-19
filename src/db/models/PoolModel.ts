import mongoose, { Schema } from 'mongoose'

const schema = new Schema({
  _id: Schema.Types.ObjectId,
  retired: Schema.Types.Boolean,
  address: {
    type: Schema.Types.String,
    unique: true,
  },
  networkType: Schema.Types.String,
  networkId: Schema.Types.Number,
  loanOptions: [
    {
      loanDurationBlock: Schema.Types.Number,
      loanDurationSecond: Schema.Types.Number,
      interestBpsBlock: Schema.Types.Decimal128,
      interestBpsBlockOverride: Schema.Types.Decimal128,
      maxLtvBps: Schema.Types.Number,
    },
  ],
  poolVersion: Schema.Types.Number,
  routerAddress: Schema.Types.String,
  repayRouterAddress: Schema.Types.String,
  rolloverAddress: Schema.Types.String,
  defaultFees: Schema.Types.Array,
  ethLimit: Schema.Types.Decimal128,
  published: Schema.Types.Boolean,
  nftCollection: {
    type: Schema.Types.ObjectId,
    ref: 'NFTCollection',
  },
}, { timestamps: true })

schema.index({ networkType: 1, networkId: 1, address: 1 })

const PoolModel = mongoose.model('Pool', schema, 'pools')

export default PoolModel
