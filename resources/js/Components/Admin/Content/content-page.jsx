"use client";

export default function ContentPage({ content }) {
  return (
    <PanelCard
      eyebrow="CMS"
      title="Content"
      description="Manage marketing pages, help docs, and onboarding content."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {content.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-base font-bold text-slate-950">{item.title}</p>
            <p className="mt-2 text-sm text-slate-500">Owner: {item.owner}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Badge tone={item.status}>{item.status}</Badge>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Edit
              </button>
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
