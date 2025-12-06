import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET || process.env.STRIPE_KEY || "";
if (!stripeSecret) {
  console.warn("WARNING: STRIPE secret key is not set (STRIPE_SECRET_KEY). Stripe calls will fail.");
}

export const stripe = new Stripe(stripeSecret, {
  apiVersion: "2022-11-15", 
});

export const demoStripeFlow = async () => {
  try {
    const products = await stripe.products.list({ limit: 1 });
    return { ok: true, productCount: products.data.length };
  } catch (err) {
    return { ok: false, message: err.message };
  }
};
