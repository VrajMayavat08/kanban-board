const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  list: { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true },
  board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  position: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Card', cardSchema);