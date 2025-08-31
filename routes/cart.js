const express = require('express');
const Photo = require('../models/Photo');
const { ensureAuthed } = require('../middlewares/auth');


const router = express.Router();


function getCart(req) {
if (!req.session.cart) req.session.cart = [];
return req.session.cart; // array of photoIds
}


router.get('/', ensureAuthed, async (req, res) => {
const ids = getCart(req);
const photos = await Photo.find({ _id: { $in: ids } });
res.json({
items: photos.map(p => ({ _id: p._id, title: p.title, priceCents: p.priceCents })),
totalCents: photos.reduce((s, p) => s + p.priceCents, 0)
});
});


router.post('/add', ensureAuthed, async (req, res) => {
const { photoId } = req.body;
const p = await Photo.findById(photoId);
if (!p) return res.status(404).json({ error: 'Photo not found' });
const cart = getCart(req);
if (!cart.includes(photoId)) cart.push(photoId);
res.json({ ok: true });
});


router.delete('/remove/:id', ensureAuthed, (req, res) => {
req.session.cart = getCart(req).filter(id => id !== req.params.id);
res.json({ ok: true });
});


router.post('/clear', ensureAuthed, (req, res) => {
req.session.cart = [];
res.json({ ok: true });
});


module.exports = router;