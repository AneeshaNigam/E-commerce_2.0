// controllers/checkout.controller.js
import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import { stripe } from "../lib/stripe.js";

function normalizeClientUrl(raw) {
  if (!raw) return null;
  let url = String(raw).trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  if (!/^https?:\/\/.+/i.test(url)) return null;
  return url.replace(/\/+$/, "");
}

function buildCompactProducts(products) {
  const compact = products.map((p) => ({
    id: p._id || p.id || null,
    quantity: Number(p.quantity) || 1,
    price: Number(p.price) || 0,
  }));

  const fullJson = JSON.stringify(compact);
  if (fullJson.length <= 800) {
    return { key: "products", value: fullJson };
  } else {
    const idQty = compact.reduce((acc, cur) => {
      if (cur.id) acc[cur.id] = cur.quantity;
      return acc;
    }, {});
    return { key: "products_short", value: JSON.stringify(idQty) };
  }
}

export const createCheckoutSession = async (req, res) => {
  try {
    console.log("createCheckoutSession called - body keys:", Object.keys(req.body || {}));
    const { products = [], couponCode = null } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Products array required and cannot be empty." });
    }

    const RAW_CLIENT_URL = process.env.CLIENT_URL;
    const CLIENT_URL = normalizeClientUrl(RAW_CLIENT_URL);
    if (!CLIENT_URL) {
      console.error("Invalid CLIENT_URL:", RAW_CLIENT_URL);
      return res.status(500).json({
        message:
          "Server misconfiguration: CLIENT_URL missing or invalid. It must include a scheme, e.g. CLIENT_URL=http://localhost:5173",
      });
    }

    let subtotalCents = 0;
    const line_items = products.map((p) => {
      const qty = Number(p.quantity) || 1;
      const priceNum = Number(p.price);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        throw new Error("Invalid product price provided.");
      }
      const unitAmountCents = Math.round(priceNum * 100);
      subtotalCents += unitAmountCents * qty;

      return {
        price_data: {
          currency: process.env.CURRENCY?.toLowerCase() || "usd",
          product_data: {
            name: p.name || "Product",
            ...(p.image ? { images: [p.image] } : {}),
          },
          unit_amount: unitAmountCents,
        },
        quantity: qty,
      };
    });

    let coupon = null;
    let stripeCouponId = null;
    if (couponCode) {
      try {
        coupon = await Coupon.findOne({ code: couponCode, isActive: true }).lean().exec();
        if (coupon && coupon.discountPercentage) {
          const stripeCoupon = await stripe.coupons.create({
            percent_off: coupon.discountPercentage,
            duration: "once",
          });
          stripeCouponId = stripeCoupon.id;
        }
      } catch (e) {
        console.warn("Coupon lookup/stripe coupon creation failed:", e?.message || e);
      }
    }

    const compact = buildCompactProducts(products);
    const userId = req.user && req.user._id ? req.user._id.toString() : "guest";

    const success_url = `${CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${CLIENT_URL}/purchase-cancel`;

    const sessionParams = {
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      success_url,
      cancel_url,
      metadata: {
        userId,
        couponCode: couponCode || "",
      },
    };

    if (stripeCouponId) {
      sessionParams.discounts = [{ coupon: stripeCouponId }];
    }

    sessionParams.metadata[compact.key] = compact.value;

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({
      id: session.id,
      url: session.url,
      amount_total: session.amount_total || subtotalCents,
    });
  } catch (err) {
    console.error("createCheckoutSession ERROR:", err && err.stack ? err.stack : err);
    const message = err?.message || "Server error while creating checkout session.";
    return res.status(500).json({ message });
  }
};

export default createCheckoutSession;
