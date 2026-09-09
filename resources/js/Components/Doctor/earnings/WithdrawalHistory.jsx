"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";

export default function WithdrawalHistory() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWithdrawals();
  }, []);

  async function loadWithdrawals() {
    try {
      setIsLoading(true);
      setWithdrawals([]);
    } catch (err) {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Payout History</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">Withdrawal History</h2>
        <p className="mt-2 text-sm text-slate-500">Track your past withdrawal requests.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />)}
        </div>
      ) : withdrawals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          No withdrawal history yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Method</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-3 py-3 text-slate-700">{item.date}</td>
                  <td className="px-3 py-3 font-medium text-slate-800">৳{item.amount}</td>
                  <td className="px-3 py-3 text-slate-600">{item.method}</td>
                  <td className="px-3 py-3"><WithdrawalStatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function WithdrawalStatusBadge({ status }) {
  const tones = {
    pending: "bg-amber-50 text-amber-700",
    processing: "bg-blue-50 text-blue-700",
    completed: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[status] || "bg-slate-50 text-slate-600"}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "-"}
    </span>
  );
}
