"use client";

import { Icon, formatCurrency } from "./dashboard-shared";

const categories = [
  { key: "prescriptions", label: "Prescriptions" },
  { key: "diagnostics", label: "Diagnostic Reports" },
  { key: "notes", label: "Appointment Notes" },
  { key: "uploads", label: "Uploaded Documents" },
  { key: "invoices", label: "Invoices" },
];

export default function MedicalRecordsPage({
  title = "Medical Records",
  description = "View, download, share, or upload clinical documentation.",
  records = {},
  recordCategory,
  setRecordCategory,
}) {
  const currentRecords = records?.[recordCategory] ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {currentRecords.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No records available in this category.
          </p>
        ) : (
          <div className="grid gap-3">
            {currentRecords.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {item.title}
                      </h4>
                      <Badge tone={item.documentType || recordCategory}>
                        {item.documentType || recordCategory}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {getRecordMeta(item)}
                    </p>
                    {item.summary ? (
                      <p className="max-w-2xl text-xs leading-5 text-slate-500">
                        {item.summary}
                      </p>
                    ) : null}
                    {item.fileName ? (
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        {item.fileName}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      {item.status || "Available"}
                    </span>
                    <ActionButton icon="eye" onClick={() => openDocument(item)}>
                      View
                    </ActionButton>
                    <ActionButton icon="download" onClick={() => downloadDocument(item)}>
                      Download
                    </ActionButton>
                    <ActionButton icon="printer" onClick={() => printDocument(item)}>
                      Print
                    </ActionButton>
                    <ActionButton icon="share" onClick={() => shareDocument(item)}>
                      Share
                    </ActionButton>
                  </div>
                </div>

                {item.documentType === "invoice" || recordCategory === "invoices" ? (
                  <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
                          Invoice
                        </p>
                        <p className="mt-1 text-sm font-bold text-rose-950">
                          {item.referenceNo || item.invoiceNo || item.title}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-rose-950">
                        {formatCurrency(item.amountCents, item.currency)}
                      </p>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({ children, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:shadow-sm"
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function Badge({ children, tone }) {
  const toneClasses = {
    prescription: "bg-blue-100 text-blue-700",
    prescriptions: "bg-blue-100 text-blue-700",
    diagnostics: "bg-emerald-100 text-emerald-700",
    notes: "bg-amber-100 text-amber-700",
    uploads: "bg-slate-100 text-slate-700",
    upload: "bg-slate-100 text-slate-700",
    invoice: "bg-rose-100 text-rose-700",
    invoices: "bg-rose-100 text-rose-700",
  };

  const key = String(tone ?? "").toLowerCase();

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
        toneClasses[key] ?? toneClasses.uploads
      }`}
    >
      {children ?? "Record"}
    </span>
  );
}

function getRecordMeta(item) {
  const pieces = [];

  if (item.doctorName || item.doctor) {
    pieces.push(item.doctorName || item.doctor);
  }

  if (item.patientName) {
    pieces.push(item.patientName);
  }

  if (item.referenceNo || item.invoiceNo) {
    pieces.push(item.referenceNo || item.invoiceNo);
  }

  if (item.date) {
    pieces.push(item.date);
  }

  return pieces.join(" - ") || "System Record";
}

function openDocument(item) {
  if (typeof window === "undefined") {
    return;
  }

  if (item.fileUrl) {
    window.open(item.fileUrl, "_blank", "noopener,noreferrer");
    return;
  }

  openPrintableWindow(item);
}

function downloadDocument(item) {
  if (typeof window === "undefined") {
    return;
  }

  if (item.fileUrl) {
    const link = document.createElement("a");
    link.href = item.fileUrl;
    link.download = item.fileName || `${slugify(item.title || "document")}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const blob = new Blob([buildDocumentText(item)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(item.title || "document")}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function printDocument(item) {
  if (typeof window === "undefined") {
    return;
  }

  openPrintableWindow(item, true);
}

async function shareDocument(item) {
  if (typeof window === "undefined") {
    return;
  }

  const shareText = `${item.title}${item.fileUrl ? ` - ${item.fileUrl}` : ""}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: item.title || "Medical record",
        text: shareText,
        url: item.fileUrl || window.location.href,
      });
      return;
    } catch {
      // Fall through to clipboard.
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(shareText);
  }
}

function openPrintableWindow(item, shouldPrint = false) {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=960,height=1100");

  if (!popup) {
    return;
  }

  popup.document.open();
  popup.document.write(buildPrintableMarkup(item));
  popup.document.close();

  if (shouldPrint) {
    popup.focus();
    window.setTimeout(() => popup.print(), 300);
  }
}

function buildPrintableMarkup(item) {
  const amount = item.amountCents ? formatCurrency(item.amountCents, item.currency) : "";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(item.title || "Document")}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 32px; color: #0f172a; background: #f8fafc; }
    .sheet { max-width: 860px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 32px; }
    .eyebrow { letter-spacing: .2em; text-transform: uppercase; font-size: 11px; color: #e11d48; font-weight: 700; }
    h1 { margin: 10px 0 8px; font-size: 28px; }
    .meta { color: #475569; font-size: 14px; margin: 4px 0; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 26px 0; }
    .card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; background: #f8fafc; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: .16em; color: #64748b; font-weight: 700; }
    .value { margin-top: 6px; font-size: 15px; font-weight: 700; color: #0f172a; white-space: pre-wrap; }
    .footer { margin-top: 28px; font-size: 12px; color: #64748b; }
    @media print { body { background: #fff; padding: 0; } .sheet { border: none; border-radius: 0; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="eyebrow">${escapeHtml(item.documentType || "record")}</div>
    <h1>${escapeHtml(item.title || "Document")}</h1>
    <p class="meta">${escapeHtml(item.patientName || "Patient")} - ${escapeHtml(item.date || "N/A")}</p>
    <p class="meta">${escapeHtml(item.doctor || item.doctorName || "Doctor")}</p>
    <p class="meta">${escapeHtml(item.referenceNo || item.invoiceNo || "No reference")}</p>
    <p class="meta">${escapeHtml(item.summary || "No notes available.")}</p>
    <p class="meta">${escapeHtml(amount || "N/A")}</p>
    <div class="footer">Generated from the HealthPortal document workflow.</div>
  </div>
</body>
</html>`;
}

function buildDocumentText(item) {
  return [
    `Title: ${item.title || "Document"}`,
    `Type: ${item.documentType || "record"}`,
    `Patient: ${item.patientName || "Patient"}`,
    `Doctor: ${item.doctor || item.doctorName || "Doctor"}`,
    `Reference: ${item.referenceNo || item.invoiceNo || "N/A"}`,
    `Date: ${item.date || "N/A"}`,
    `Amount: ${item.amountCents ? formatCurrency(item.amountCents, item.currency) : "N/A"}`,
    "",
    item.summary || "No notes available.",
  ].join("\n");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "document";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
