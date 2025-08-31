const express = require('express');
const Stripe = require('stripe');
const Photo = require('../models/Photo');
const CheckoutSession = require('../models/CheckoutSession');
const Order = require('../models/Order');
const { ensureAuthed } = require('../middlewares/auth');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Create Checkout Session
router.post('/create', ensureAuthed, async (req, res) => {
  try {
    const ids = req.session.cart || [];
    if (!ids.length) return res.status(400).json({ error: 'Cart is empty' });

    const photos = await Photo.find({ _id: { $in: ids } });
    if (!photos.length) return res.status(400).json({ error: 'Cart invalid' });

    const line_items = photos.map(p => ({
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: p.priceCents,
        product_data: { name: p.title }
      }
    }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${process.env.BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/cart.html`
    });

    await CheckoutSession.create({
      sessionId: session.id,
      user: req.session.user._id,
      photoIds: photos.map(p => p._id)
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not create checkout session' });
  }
});

// Confirm on success page
router.get('/confirm', ensureAuthed, async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    const pending = await CheckoutSession.findOne({
      sessionId: session_id,
      user: req.session.user._id
    });
    if (!pending) return res.status(404).json({ error: 'Checkout session not found' });

    await Order.create({
      user: req.session.user._id,
      photoIds: pending.photoIds,
      stripeSessionId: session_id
    });
    await pending.deleteOne();

    req.session.cart = [];

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Confirm failed' });
  }
});

module.exports = router;
