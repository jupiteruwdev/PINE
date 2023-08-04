import mongoose from 'mongoose'

const { Schema } = mongoose

const schema = new Schema({
  blockNumber: Schema.Types.Number,
  root: Schema.Types.String,
  address: Schema.Types.String,
  index: Schema.Types.Number,
  proof: [Schema.Types.String],
  leaf: Schema.Types.String,
  amount: Schema.Types.String,
  claimed: Schema.Types.Boolean,
}, { timestamps: true })

schema.index({ blockNumber: 1, root: 1 })

const MerkleTreeModel = mongoose.model('MerkleTree', schema, 'merkleTrees')

export default MerkleTreeModel
