import mongoose from 'mongoose'

const { Schema } = mongoose

const schema = new Schema({
  address: Schema.Types.String,
  networkType: Schema.Types.String,
  networkId: Schema.Types.String,
  interactionAddresses: [Schema.Types.String],
}, { timestamps: true })

schema.index({ networkType: 1, networkId: 1, address: 1 })

const UserModel = mongoose.model('User', schema, 'users')

export default UserModel
