// routes/photos.js
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const Photo = require('../models/Photo');
const { ensureAuthed, ensurePhotographer } = require('../middlewares/auth');
const { uploadBuffer, deleteObject, signGetUrl } = require('../config/b2');

const router = express.Router();

// 20 MB per image (adjust if needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

// ---- Public list
router.get('/', async (_req, res) => {
  const photos = await Photo.find().populate('owner', 'name');
  const items = await Promise.all(photos.map(async p => ({
    _id: p._id,
    title: p.title,
    priceCents: p.priceCents,
    ownerName: p.owner?.name || 'Unknown',
    thumbUrl: await signGetUrl(p.keyThumb, 900)
  })));
  res.json({ items });
});

// ---- My photos
router.get('/mine', ensureAuthed, ensurePhotographer, async (req, res) => {
  const photos = await Photo.find({ owner: req.session.user._id });
  const items = await Promise.all(photos.map(async p => ({
    _id: p._id,
    title: p.title,
    priceCents: p.priceCents,
    thumbUrl: await signGetUrl(p.keyThumb, 900)
  })));
  res.json({ items });
});

// ---- Upload (with Multer error handling)
router.post(
  '/',
  ensureAuthed,
  ensurePhotographer,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File too large (max 20 MB)' });
        }
        console.error('[UPLOAD] Multer error:', err);
        return res.status(400).json({ error: 'Bad upload' });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { title, price } = req.body;
      const file = req.file;

      if (!file) return res.status(400).json({ error: 'No file uploaded' });
      if (!ALLOWED.has(file.mimetype)) {
        return res.status(400).json({ error: 'Only JPG/PNG/WebP allowed' });
      }

      const priceCents = Math.round(parseFloat(price) * 100);
      if (!priceCents || priceCents < 50) return res.status(400).json({ error: 'Price must be >= $0.50' });

      const cleanTitle = (title || file.originalname.replace(/\.[^.]+$/, '')).trim();
      if (cleanTitle.length < 2) return res.status(400).json({ error: 'Title required' });

      console.log('[UPLOAD] start', {
        user: req.session.user._id.toString(),
        name: file.originalname,
        size: file.size,
        type: file.mimetype
      });

      // Create DB record first (keys pending)
      const photo = await Photo.create({
        title: cleanTitle,
        owner: req.session.user._id,
        priceCents,
        mimeType: file.mimetype,
        keyOriginal: 'pending',
        keyThumb: 'pending'
      });

      const keyOriginal = `photos/${photo._id}.orig`;
      const keyThumb = `thumbnails/${photo._id}.jpg`;

// Build thumbnail (auto-rotate using EXIF)
let thumb;
try {
  thumb = await sharp(file.buffer)
    .rotate() // 👈 fix sideways images
    .resize({ width: 800, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
} catch (imgErr) {
  console.error('[UPLOAD] sharp error:', imgErr);
  await photo.deleteOne().catch(() => {});
  return res.status(415).json({ error: 'Could not process image' });
}


      // Upload to B2 with timeouts (from config/b2.js)
      try {
        await uploadBuffer(keyOriginal, file.buffer, file.mimetype, 20000);
        await uploadBuffer(keyThumb, thumb, 'image/jpeg', 20000);
      } catch (b2err) {
        console.error('[B2 ERROR]', b2err);
        await photo.deleteOne().catch(() => {});
        return res.status(502).json({ error: `B2 upload failed: ${b2err.message}` });
      }

      photo.keyOriginal = keyOriginal;
      photo.keyThumb = keyThumb;
      await photo.save();

      console.log('[UPLOAD] ok', photo._id.toString());
      res.json({ ok: true, photoId: photo._id });
    } catch (e) {
      console.error('[UPLOAD] fatal', e);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

// ---- Delete
router.delete('/:id', ensureAuthed, ensurePhotographer, async (req, res) => {
  const photo = await Photo.findById(req.params.id);
  if (!photo) return res.status(404).json({ error: 'Not found' });
  if (photo.owner.toString() !== req.session.user._id) return res.status(403).json({ error: 'Not yours' });
  try { await deleteObject(photo.keyOriginal); } catch {}
  try { await deleteObject(photo.keyThumb); } catch {}
  await photo.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
