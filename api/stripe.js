import Stripe from 'stripe';
import express from 'express';

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY;   // price_xxx for €9.99/mo
const PRICE_YEARLY  = process.env.STRIPE_PRICE_YEARLY;    // price_xxx for €79.99/yr
const PRICE_AI      = process.env.STRIPE_PRICE_AI;        // price_xxx for €19.99/mo
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const CLIENT_URL    = process.env.CLIENT_URL || 'http://localhost:5173';

// ─── Checkout ───

router.post('/checkout', express.json(), async (req, res) => {
  try {
    const { priceId, deviceId } = req.body;

    const allowed = [PRICE_MONTHLY, PRICE_YEARLY, PRICE_AI].filter(Boolean);
    if (!allowed.includes(priceId)) {
      return res.status(400).json({ error: 'Invalid price' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${CLIENT_URL}?sub=success`,
      cancel_url: `${CLIENT_URL}?sub=cancel`,
      metadata: { deviceId: deviceId || 'web' },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

// ─── Customer Portal ───

router.post('/portal', express.json(), async (req, res) => {
  try {
    const { customerId } = req.body;
    if (!customerId) return res.status(400).json({ error: 'Missing customerId' });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: CLIENT_URL,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal error:', err.message);
    res.status(500).json({ error: 'Portal failed' });
  }
});

// ─── Prices (public) ───

router.get('/prices', (_req, res) => {
  res.json({
    monthly: { id: PRICE_MONTHLY, amount: 999, currency: 'eur', label: '€9,99/Mo' },
    yearly:  { id: PRICE_YEARLY,  amount: 7999, currency: 'eur', label: '€79,99/Jahr' },
    ai:      { id: PRICE_AI,      amount: 1999, currency: 'eur', label: '€19,99/Mo' },
  });
});

// ─── Webhook ───

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log(`[Stripe] Checkout complete: ${session.id}, customer: ${session.customer}`);
      // In production: store subscription status in DB keyed by customer/deviceId
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const active = sub.status === 'active' || sub.status === 'trialing';
      console.log(`[Stripe] Sub ${sub.id}: ${sub.status} (active=${active})`);
      // In production: update user entitlement in DB
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
});

// ─── Subscription Status (by device/customer) ───

router.get('/status', async (req, res) => {
  try {
    const customerId = req.query.customer;
    if (!customerId) return res.json({ tier: 'free' });

    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subs.data.length === 0) return res.json({ tier: 'free' });

    const sub = subs.data[0];
    const priceId = sub.items.data[0]?.price?.id;

    let tier = 'pro';
    if (priceId === PRICE_AI) tier = 'ai';

    res.json({
      tier,
      expiresAt: new Date(sub.current_period_end * 1000).toISOString(),
      customerId: sub.customer,
    });
  } catch (err) {
    console.error('Stripe status error:', err.message);
    res.status(500).json({ error: 'Status check failed' });
  }
});

export default router;
