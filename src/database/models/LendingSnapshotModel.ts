import mongoose from 'mongoose'

const { Schema } = mongoose

const schema = new Schema({
  lenderAddress: Schema.Types.String,
  collectionAddress: Schema.Types.String,
  fundSource: Schema.Types.String,
  capacity: Schema.Types.Number,
  networkType: Schema.Types.String,
  networkId: Schema.Types.String,
  blockNumber: Schema.Types.Number,
}, { timestamps: true })

const LendingSnapshotModel = mongoose.model('LendingSnapshotModel', schema, 'lendingSnapshots')

export default LendingSnapshotModel
