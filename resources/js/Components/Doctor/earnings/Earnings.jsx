"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";
import EarningsOverview from "./EarningsOverview";
import EarningsHistory from "./EarningsHistory";
import EarningsChart from "./EarningsChart";

export default function Earnings() {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiFetch("/doctor/earnings/summary");
      const data = await response.json();
      if (data.success) {
        setSummary(data.data);
      } else {
        setError(data.message || "Failed to load earnings summary.");
      }
    } catch (err) {
      setError("An error occurred while loading earnings data.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Earnings</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Review your revenue, payout status, and appointment earnings.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <EarningsOverview summary={summary} isLoading={isLoading} />
      <EarningsChart />
      <EarningsHistory />
    </div>
  );
}
