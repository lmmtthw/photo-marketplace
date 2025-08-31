const express = require('express');
const Order = require('../models/Order');
const Photo = require('../models/Photo');
const { ensureAuthed } = require('../middlewares/auth');
const { getObjectStream } = require('../config/b2');


const router = express.Router();


router.get('/', ensureAuthed, async (req, res) => {
const orders = await Order.find({ user: req.session.user._id }).sort({ createdAt: -1 }).lean();
const photos = await Photo.find({ _id: { $in: orders.flatMap(o => o.photoIds) } }).lean();
const photoMap = new Map(photos.map(p => [p._id.toString(), p]));


const result = orders.map(o => ({
_id: o._id,
createdAt: o.createdAt,
items: o.photoIds.map(pid => ({
_id: pid,
title: photoMap.get(pid.toString())?.title || 'Unknown',
downloadUrl: `/api/orders/download/${pid}`
}))
}));


res.json({ orders: result });
});


// Secure download: only if bought
router.get('/download/:photoId', ensureAuthed, async (req, res) => {
const photoId = req.params.photoId;
const hasOrder = await Order.exists({ user: req.session.user._id, photoIds: photoId });
if (!hasOrder) return res.status(403).json({ error: 'Not purchased' });


const photo = await Photo.findById(photoId);
if (!photo) return res.status(404).json({ error: 'Photo not found' });


try {
const { stream, contentType } = await getObjectStream(photo.keyOriginal);
res.setHeader('Content-Type', contentType || 'application/octet-stream');
res.setHeader('Content-Disposition', `attachment; filename="${photo.title.replace(/[^a-z0-9-_]/gi, '_')}.jpg"`);
stream.pipe(res);
} catch (e) {
console.error(e);
res.status(500).json({ error: 'Download failed' });
}
});


module.exports = router;