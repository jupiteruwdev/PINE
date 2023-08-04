import mongoose from 'mongoose'

const { Schema } = mongoose

const schema = new Schema({
  name: Schema.Types.String,
  value: {
    amount: Schema.Types.Number,
    currency: Schema.Types.String,
  },
}, { timestamps: true })

const PriceModel = mongoose.model('PriceModel', schema, 'prices')

export default PriceModel
