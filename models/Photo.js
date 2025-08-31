const mongoose = require('mongoose');


const PhotoSchema = new mongoose.Schema({
title: { type: String, required: true },
owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
priceCents: { type: Number, required: true, min: 50 },
mimeType: { type: String, required: true },
keyOriginal: { type: String, required: true },
keyThumb: { type: String, required: true }
}, { timestamps: true });


module.exports = mongoose.model('Photo', PhotoSchema);