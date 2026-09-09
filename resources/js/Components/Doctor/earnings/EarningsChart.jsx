"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";

export default function EarningsChart() {
  const [period, setPeriod] = useState("daily");
  const [trend, setTrend] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTrend();
  }, [period]);

  async function loadTrend() {
    try {
      setIsLoading(true);
      const response = await apiFetch(`/doctor/earnings/trend?period=${period}`);
      const data = await response.json();
      if (data.success) {
        setTrend(data.data);
      }
    } catch (err) {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }

  const maxValue = trend.length > 0 ? Math.max(...trend.map((d) => d.value)) : 0;

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Analytics</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">Earnings Trend</h2>
        </div>
        <div className="flex gap-2">
          {["daily", "weekly", "monthly", "yearly"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                period === p
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-lg bg-slate-100" />
      ) : trend.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
          No earnings data available for this period.
        </div>
      ) : (
        <div className="flex h-48 items-end gap-1.5">
          {trend.map((point, index) => {
            const height = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
            return (
              <div key={index} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-emerald-500 transition-all hover:bg-emerald-600"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${point.label}: ৳${formatAmount(point.value)}`}
                />
                <span className="text-[10px] text-slate-400 truncate max-w-full">
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatAmount(value) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
