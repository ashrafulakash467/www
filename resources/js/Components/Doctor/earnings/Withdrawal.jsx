"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";

export default function Withdrawal() {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadBalance();
  }, []);

  async function loadBalance() {
    try {
      const response = await apiFetch("/doctor/earnings/balance");
      const data = await response.json();
      if (data.success) {
        setBalance(data.data.available_balance);
      }
    } catch (err) {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);

    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      setMessage({ type: "error", text: "Please enter a valid amount." });
      return;
    }
    if (withdrawAmount > balance) {
      setMessage({ type: "error", text: "Amount exceeds available balance." });
      return;
    }

    setIsSubmitting(true);
    try {
      setMessage({ type: "success", text: "Withdrawal request submitted successfully." });
      setAmount("");
      loadBalance();
    } catch (err) {
      setMessage({ type: "error", text: "Failed to submit withdrawal request." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Payout</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">Request Withdrawal</h2>
        <p className="mt-2 text-sm text-slate-500">Withdraw your available earnings.</p>
      </div>

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Available Balance</p>
            <p className="mt-2 text-3xl font-bold text-emerald-800">
              ৳{Number(balance).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <div className={`rounded-lg px-4 py-3 text-sm ${message.type === "error" ? "border border-red-200 bg-red-50 text-red-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {message.text}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount (৳)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Request Withdrawal"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
