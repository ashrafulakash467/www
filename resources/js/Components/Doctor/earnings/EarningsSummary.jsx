"use client";

export default function EarningsSummary({ summary, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard label="Total Earnings" value={summary?.total_earnings} color="emerald" />
      <SummaryCard label="Available Balance" value={summary?.available_balance} color="blue" />
      <SummaryCard label="Pending" value={summary?.pending_earnings} color="amber" />
      <SummaryCard label="This Month" value={summary?.month_earnings} color="slate" />
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  const colors = {
    emerald: "border-emerald-200 bg-emerald-50",
    blue: "border-blue-200 bg-blue-50",
    amber: "border-amber-200 bg-amber-50",
    slate: "border-slate-200 bg-slate-50",
  };

  return (
    <div className={`rounded-xl border p-5 ${colors[color] || colors.slate}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-900">
        ৳{Number(value ?? 0).toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}
