import mongoose from 'mongoose'
const { Schema } = mongoose

const schema = new Schema({
  _id: Schema.Types.ObjectId,
  retired: Schema.Types.Boolean,
  address: Schema.Types.String,
  loanOptions: [
    {
      loanDurationBlock: Schema.Types.Number,
      loanDurationSecond: Schema.Types.Number,
      interestBpsBlock: Schema.Types.Decimal128,
      interestBpsBlockOverride: Schema.Types.Decimal128,
      maxLtvBps: Schema.Types.Number,
    },
  ],
  nftCollection: {
    type: Schema.Types.ObjectId,
    ref: 'nftCollection',
  },
})

const PoolModel = mongoose.model('pool', schema, 'pools')

export default PoolModel
