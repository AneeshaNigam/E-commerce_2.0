import { useState } from "react";
import { motion } from "framer-motion";
import { useCartStore } from "../stores/useCartStore";
import { Link } from "react-router-dom";
import { MoveRight } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import axios from "../lib/axios";

const stripePromise = loadStripe(
  "pk_test_51KZYccCoOZF2UhtOwdXQl3vcizup20zqKqT9hVUIsVzsdBrhqbUI2fE0ZdEVLdZfeHjeyFXtqaNsyCJCmZWnjNZa00PzMAjlcL"
);

const OrderSummary = () => {
  const { total, subtotal, coupon, isCouponApplied, cart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const savings = Math.max(0, subtotal - total);
  const formattedSubtotal = Number(subtotal).toFixed(2);
  const formattedTotal = Number(total).toFixed(2);
  const formattedSavings = Number(savings).toFixed(2);

  const handlePayment = async () => {
    if (!Array.isArray(cart) || cart.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (loading) return; 
    setLoading(true);
    setError("");

    try {
      const stripe = await stripePromise;
      const res = await axios.post("/payments/create-checkout-session", {
        products: cart,
        couponCode: coupon ? coupon.code : null,
      });

      const data = res.data;

      
      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      if (!data?.id) {
        throw new Error("Invalid session returned from server.");
      }

      const result = await stripe.redirectToCheckout({ sessionId: data.id });

      if (result?.error) {
        console.error("Stripe redirect error:", result.error);
        setError(result.error.message || "Unable to redirect to checkout.");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      // normalize axios / server error messages
      const message =
        (err?.response?.data?.message && `${err.response.data.message}`) ||
        err?.message ||
        "Failed to create checkout session.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className='space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-sm sm:p-6'
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <p className='text-xl font-semibold text-emerald-400'>Order summary</p>

      <div className='space-y-4'>
        <div className='space-y-2'>
          <dl className='flex items-center justify-between gap-4'>
            <dt className='text-base font-normal text-gray-300'>Original price</dt>
            <dd className='text-base font-medium text-white'>${formattedSubtotal}</dd>
          </dl>

          {savings > 0 && (
            <dl className='flex items-center justify-between gap-4'>
              <dt className='text-base font-normal text-gray-300'>Savings</dt>
              <dd className='text-base font-medium text-emerald-400'>-${formattedSavings}</dd>
            </dl>
          )}

          {coupon && isCouponApplied && (
            <dl className='flex items-center justify-between gap-4'>
              <dt className='text-base font-normal text-gray-300'>Coupon ({coupon.code})</dt>
              <dd className='text-base font-medium text-emerald-400'>-{coupon.discountPercentage}%</dd>
            </dl>
          )}
          <dl className='flex items-center justify-between gap-4 border-t border-gray-600 pt-2'>
            <dt className='text-base font-bold text-white'>Total</dt>
            <dd className='text-base font-bold text-emerald-400'>${formattedTotal}</dd>
          </dl>
        </div>

        {error && <div className='text-sm text-red-400'>{error}</div>}

        <motion.button
          className={`flex w-full items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-4 focus:ring-emerald-300 ${
            loading ? "bg-emerald-400 cursor-wait" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
          whileHover={loading ? {} : { scale: 1.05 }}
          whileTap={loading ? {} : { scale: 0.95 }}
          onClick={handlePayment}
          disabled={loading}
        >
          {loading ? "Redirecting…" : "Proceed to Checkout"}
        </motion.button>

        <div className='flex items-center justify-center gap-2'>
          <span className='text-sm font-normal text-gray-400'>or</span>
          <Link
            to='/'
            className='inline-flex items-center gap-2 text-sm font-medium text-emerald-400 underline hover:text-emerald-300 hover:no-underline'
          >
            Continue Shopping
            <MoveRight size={16} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default OrderSummary;
