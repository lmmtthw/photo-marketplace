const mongoose = require('mongoose');


const OrderSchema = new mongoose.Schema({
user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
photoIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo', required: true }],
stripeSessionId: { type: String, required: true }
}, { timestamps: true });


module.exports = mongoose.model('Order', OrderSchema);