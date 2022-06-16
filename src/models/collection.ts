import mongoose from 'mongoose'
const { Schema } = mongoose

const schema = new Schema({
  _id: String,
  vendorIds: {
    opensea: String,
  },
  displayName: String,
  address: String,
  networkType: String,
  networkId: Number,
  imageUrl: String,
  lendingPools: [
    {
      address: String,
      retired: Boolean,
      loanOptions: [
        {
          loanDurationBlock: Number,
          loanDurationSecond: Number,
          interestBpsBlock: Number,
          interestBpsBlockOverride: Number,
          maxLtvBps: Number,
        },
      ],
    },
  ],
})

const CollectionModel = mongoose.model('collection', schema, 'collection')

export default CollectionModel
