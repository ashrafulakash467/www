"use client";

import { Icon } from "../Dashboard_Overview/dashboard-shared";

export default function MedicalRecordsPage({
  title = "Medical Records",
  description = "View, download, share, or upload clinical documentation.",
  records,
  recordCategory,
  setRecordCategory,
}) {
  const categories = [
    { key: "prescriptions", label: "Prescriptions" },
    { key: "diagnostics", label: "Diagnostic Reports" },
    { key: "notes", label: "Appointment Notes" },
    { key: "uploads", label: "Uploaded Documents" },
    { key: "invoices", label: "Invoices" },
  ];

  const currentRecords = records[recordCategory] || [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setRecordCategory(cat.key)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                recordCategory === cat.key
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {currentRecords.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No records available in this category.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {currentRecords.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {item.title}
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.doctor ||
                      item.facility ||
                      item.amount ||
                      "System Record"}{" "}
                    - {item.date}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    title="View Record"
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Icon name="eye" className="h-3.5 w-3.5" />
                    View
                  </button>
                  <button
                    title="Download"
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Icon name="download" className="h-3.5 w-3.5" />
                    Download
                  </button>
                  <button
                    title="Share with Provider"
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Icon name="share" className="h-3.5 w-3.5" />
                    Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
