"use client";

export default function ReportsPage({ reports, selectedReportId, onSelectReport }) {
  const selectedReport =
    reports.find((report) => report.id === selectedReportId) ?? reports[0];

  return (
    <PanelCard
      eyebrow="Reports & Analytics"
      title="Reports"
      description="View high level exports and analytics deliverables."
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-3">
          {reports.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => onSelectReport(report.id)}
              className={`w-full rounded-2xl border p-5 text-left transition ${
                selectedReport?.id === report.id
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <p className="text-base font-bold">{report.title}</p>
              <p className="mt-1 text-sm opacity-80">Owner: {report.owner}</p>
              <p className="mt-3 text-sm opacity-80">Status: {report.status}</p>
            </button>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            eyebrow="Selected Report"
            title={selectedReport?.title ?? "Select report"}
            description="Use the report workspace to prepare downloads and exports."
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MiniMetric
              label="Owner"
              value={selectedReport?.owner ?? "-"}
              tone="blue"
            />
            <MiniMetric
              label="Status"
              value={selectedReport?.status ?? "-"}
              tone="emerald"
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Download
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Share
            </button>
          </div>
        </section>
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
