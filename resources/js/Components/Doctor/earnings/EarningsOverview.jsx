"use client";

export default function EarningsOverview({ summary, isLoading }) {
  const cards = [
    {
      label: "Total Earnings",
      value: summary?.total_earnings,
      tone: "text-emerald-700",
      bgTone: "bg-emerald-50",
    },
    {
      label: "Available Balance",
      value: summary?.available_balance,
      tone: "text-blue-700",
      bgTone: "bg-blue-50",
    },
    {
      label: "Pending Earnings",
      value: summary?.pending_earnings,
      tone: "text-amber-700",
      bgTone: "bg-amber-50",
    },
    {
      label: "Total Withdrawn",
      value: summary?.total_withdrawn,
      tone: "text-purple-700",
      bgTone: "bg-purple-50",
    },
    {
      label: "Today's Earnings",
      value: summary?.today_earnings,
      tone: "text-slate-700",
      bgTone: "bg-slate-50",
    },
    {
      label: "This Month",
      value: summary?.month_earnings,
      tone: "text-slate-700",
      bgTone: "bg-slate-50",
    },
  ];

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          Overview
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">
          Earnings Summary
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Your financial performance at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border border-slate-200 p-5 ${card.bgTone}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <div className="mt-2 min-h-9">
              {isLoading ? (
                <span className="block h-7 w-24 animate-pulse rounded bg-slate-200" />
              ) : (
                <p className={`text-2xl font-bold ${card.tone}`}>
                  ৳{formatAmount(card.value)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatAmount(value) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
