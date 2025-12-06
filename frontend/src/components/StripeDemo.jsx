import { useState } from "react";
import axios from "../lib/axios";

export default function StripeDemo() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runDemo = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await axios.get("/api/payment/demo/demo-payout");
      setResult(data);
    } catch (e) {
      setError(e.response?.data || { message: e.message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-md shadow-sm">
      <button
        onClick={runDemo}
        disabled={running}
        className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-60"
      >
        {running ? "Running demo..." : "Run Stripe Demo"}
      </button>

      <div className="mt-4">
        {error && (
          <pre className="p-3 bg-red-50 text-red-700 rounded">{JSON.stringify(error, null, 2)}</pre>
        )}
        {result && (
          <pre className="p-3 bg-gray-50 rounded overflow-auto text-sm">{JSON.stringify(result, null, 2)}</pre>
        )}
      </div>

      <div className="mt-3 text-sm text-gray-600">
        <a href="https://dashboard.stripe.com/test/charges" target="_blank" rel="noreferrer" className="underline">
          Open Stripe Dashboard (Test mode)
        </a>
      </div>
    </div>
  );
}
