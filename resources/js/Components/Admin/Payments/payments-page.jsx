"use client";

import { formatCurrency } from "../Dashboard_Overview/dashboard-shared";

export default function PaymentsPage({ payments }) {
  const totalRevenue = payments
    .filter((payment) => payment.status === "Paid" || payment.status === "Settled")
    .reduce((sum, payment) => sum + payment.amountCents, 0);

  return (
    <PanelCard
      eyebrow="Payment & Finance"
      title="Payments"
      description="Track revenue, refunds, and settlement batches."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MiniMetric
          label="Revenue"
          value={formatCurrency(totalRevenue, "BDT")}
          tone="emerald"
        />
        <MiniMetric
          label="Refund Queue"
          value={payments.filter((item) => item.status.includes("Refund")).length}
          tone="amber"
        />
        <MiniMetric
          label="Settlement Batches"
          value={payments.filter((item) => item.status === "Settled").length}
          tone="blue"
        />
      </div>

      <div className="mt-6 space-y-3">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-bold text-slate-950">
                {payment.reference}
              </p>
              <p className="mt-1 text-sm text-slate-500">{payment.note}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-base font-bold text-slate-950">
                {formatCurrency(payment.amountCents, "BDT")}
              </p>
              <Badge tone={payment.status}>{payment.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function PanelCard({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function MiniMetric({ label, value, tone = "slate" }) {
  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-800"
      : tone === "amber"
        ? "bg-amber-50 text-amber-800"
        : tone === "blue"
          ? "bg-blue-50 text-blue-800"
          : "bg-slate-50 text-slate-800";

  return (
    <div className={`rounded-2xl px-4 py-3 ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-base font-bold">{value}</p>
    </div>
  );
}

function Badge({ children, tone }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${badgeTone(tone)}`}
    >
      {children}
    </span>
  );
}

function badgeTone(value) {
  const text = String(value ?? "").toLowerCase();

  if (
    text.includes("approved") ||
    text.includes("paid") ||
    text.includes("settled") ||
    text.includes("active") ||
    text.includes("onboarded") ||
    text.includes("ready")
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    text.includes("pending") ||
    text.includes("review") ||
    text.includes("refund") ||
    text.includes("otp") ||
    text.includes("high")
  ) {
    return "bg-amber-50 text-amber-700";
  }

  if (text.includes("reject") || text.includes("suspend")) {
    return "bg-red-50 text-red-700";
  }

  if (text.includes("open") || text.includes("draft")) {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-slate-100 text-slate-700";
}
