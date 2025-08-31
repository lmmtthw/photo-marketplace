const mongoose = require('mongoose');

const CheckoutSessionSchema = new mongoose.Schema({
sessionId: { type: String, required: true, unique: true },
user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
photoIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo', required: true }]
}, { timestamps: true });


module.exports = mongoose.model('CheckoutSession', CheckoutSessionSchema);