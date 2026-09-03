"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon, formatCurrency, formatTimeLeft, parseAppointmentDateTime } from "./dashboard-shared";
import { saveDocumentRecord } from "@/utils/medical-records";

const documentCategories = [
  { title: "Prescription", type: "pdf" },
  { title: "Diagnostic Reports", type: "report" },
  { title: "Invoice", type: "invoice" },
];

export default function UploadDocumentPage({
  appointments = [],
  selectedAppointmentId,
  onSelectAppointment,
  records = {},
  now = Date.now(),
  onMedicalRecordsChanged,
}) {
  const [documentType, setDocumentType] = useState("pdf");
  const [title, setTitle] = useState("Prescription");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [documentDate, setDocumentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amountCents, setAmountCents] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (appointments.length === 0) {
      return;
    }

    const selectedStillExists = appointments.some(
      (appointment) => appointment.id === selectedAppointmentId,
    );

    if (!selectedAppointmentId || !selectedStillExists) {
      onSelectAppointment(appointments[0].id);
    }
  }, [appointments, onSelectAppointment, selectedAppointmentId]);

  const selectedAppointment =
    appointments.find((appointment) => appointment.id === selectedAppointmentId) ?? null;

  const selectedStart = selectedAppointment
    ? parseAppointmentDateTime(
        selectedAppointment.appointmentDate,
        selectedAppointment.slotTime,
      )
    : null;
  const selectedTimeLeft = selectedStart
    ? formatTimeLeft(selectedStart.getTime() - now)
    : "Unavailable";

  const documentItems = useMemo(() => {
    const uploads = (records.uploads ?? []).map((item) => ({
      ...item,
      documentType: item.documentType || "pdf",
    }));
    const invoices = (records.invoices ?? []).map((item) => ({
      ...item,
      documentType: "invoice",
    }));

    return [...invoices, ...uploads].sort((left, right) => {
      const leftDate = new Date(left.date || left.documentDate || 0).getTime();
      const rightDate = new Date(right.date || right.documentDate || 0).getTime();
      return rightDate - leftDate;
    });
  }, [records.invoices, records.uploads]);

  function resetForm() {
    setTitle("Prescription");
    setDocumentType("pdf");
    setReferenceNo("");
    setNotes("");
    setDocumentDate(new Date().toISOString().slice(0, 10));
    setAmountCents("");
    setDocumentUrl("");
    setDocumentFile(null);
  }

  function handleCategoryChange(event) {
    const category = documentCategories.find((item) => item.title === event.target.value);

    setTitle(category?.title || "Prescription");
    setDocumentType(category?.type || "pdf");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedAppointment) {
      setError("Select an appointment before uploading a document.");
      return;
    }

    if (!title.trim()) {
      setError("Add a document title first.");
      return;
    }

    if (!documentFile && !documentUrl.trim() && documentType !== "invoice") {
      setError("Attach a PDF/file or provide a document URL.");
      return;
    }

    setError("");
    setMessage("");

    try {
      await saveDocumentRecord({
        appointmentId: selectedAppointment.id,
        title: title.trim(),
        documentType,
        notes: notes.trim() || undefined,
        referenceNo: referenceNo.trim() || undefined,
        documentDate,
        amountCents: documentType === "invoice" ? amountCents : undefined,
        documentUrl: documentUrl.trim() || undefined,
        documentFile: documentFile ?? undefined,
      });

      setMessage(`Document saved for ${selectedAppointment.patient?.name || "patient"}.`);
      resetForm();
      await onMedicalRecordsChanged?.();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Could not save document.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Upload Document</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Attach invoices, PDFs, or printable notes to an appointment so the
            patient can view them later.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {appointments.length} appointments
        </span>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Choose appointment
              </h2>
              <p className="text-sm text-slate-500">
                Pick the consultation that should own the document.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {appointments.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No appointments available.
              </p>
            ) : (
              appointments.map((appointment) => {
                const isSelected = appointment.id === selectedAppointmentId;
                const slotStart = parseAppointmentDateTime(
                  appointment.appointmentDate,
                  appointment.slotTime,
                );
                const countdown = slotStart
                  ? formatTimeLeft(slotStart.getTime() - now)
                  : "Unavailable";

                return (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={() => onSelectAppointment(appointment.id)}
                    className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                      isSelected
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-900"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className={`text-sm font-bold ${isSelected ? "text-white" : "text-slate-900"}`}>
                          {appointment.patient?.name || appointment.patientName || "Patient"}
                        </p>
                        <p className={`text-xs ${isSelected ? "text-slate-200" : "text-slate-500"}`}>
                          {appointment.doctor?.specialty || "Consultation"} - {appointment.appointmentDate} at {appointment.slotTime}
                        </p>
                      </div>
                      <div className={`text-right ${isSelected ? "text-slate-100" : "text-slate-600"}`}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-current/70">
                          Time left
                        </p>
                        <p className="text-sm font-bold text-current">{countdown}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {selectedAppointment ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="border-b border-slate-100 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedAppointment.patient?.name || selectedAppointment.patientName || "Patient"}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                    {selectedAppointment.status || "pending"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedAppointment.doctor?.specialty || "Consultation"} - {selectedAppointment.appointmentDate} at {selectedAppointment.slotTime}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold text-slate-700">
                  Document category
                  <select
                    value={title}
                    onChange={handleCategoryChange}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none transition focus:border-slate-400"
                  >
                    {documentCategories.map((category) => (
                      <option key={category.title} value={category.title}>
                        {category.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm font-semibold text-slate-700">
                  Reference number
                  <input
                    value={referenceNo}
                    onChange={(event) => setReferenceNo(event.target.value)}
                    placeholder="Optional invoice or document number"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </label>

                <label className="space-y-2 text-sm font-semibold text-slate-700">
                  Document date
                  <input
                    type="date"
                    value={documentDate}
                    onChange={(event) => setDocumentDate(event.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </label>
              </div>

              {documentType === "invoice" ? (
                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  Invoice amount
                  <input
                    type="number"
                    min="0"
                    value={amountCents}
                    onChange={(event) => setAmountCents(event.target.value)}
                    placeholder="Amount in cents"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none transition focus:border-slate-400"
                  />
                  <span className="block text-xs font-normal text-slate-500">
                    Store the amount in cents to stay consistent with the rest of the dashboard.
                  </span>
                </label>
              ) : null}

              <label className="block space-y-2 text-sm font-semibold text-slate-700">
                File URL or PDF upload
                <input
                  type="url"
                  value={documentUrl}
                  onChange={(event) => setDocumentUrl(event.target.value)}
                  placeholder="Optional public document URL"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none transition focus:border-slate-400"
                />
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                />
              </label>

              <label className="block space-y-2 text-sm font-semibold text-slate-700">
                Notes
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  placeholder="Optional context, clinical notes, or invoice notes"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none transition focus:border-slate-400"
                />
              </label>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-hover"
              >
                Save document
              </button>
            </form>
          ) : (
            <div className="flex min-h-[520px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
              <div className="max-w-sm space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Select an appointment
                </h3>
                <p className="text-sm text-slate-500">
                  Choose a consultation first, then attach the invoice or PDF
                  that belongs to it.
                </p>
              </div>
            </div>
          )}
        </section>
       </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent documents</h2>
            <p className="text-sm text-slate-500">
              These are the saved uploads and payment invoices currently in the database.
            </p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {documentItems.length} total
          </p>
        </div>

        {documentItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No documents available yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {documentItems.map((item) => (
              <DocumentCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DocumentCard({ item }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
              {item.documentType || "record"}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {item.patientName || "Patient"} - {item.date || "N/A"}
          </p>
          {item.summary ? (
            <p className="max-w-xl text-xs leading-5 text-slate-500">
              {item.summary}
            </p>
          ) : null}
        </div>

        <div className="space-y-1 text-right">
          {item.amountCents ? (
            <p className="text-sm font-bold text-rose-700">
              {formatCurrency(item.amountCents, item.currency)}
            </p>
          ) : null}
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {item.referenceNo || item.invoiceNo || "No reference"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton icon="eye" onClick={() => openDocument(item)}>
          View
        </ActionButton>
        <ActionButton icon="download" onClick={() => downloadDocument(item)}>
          Download
        </ActionButton>
        <ActionButton icon="printer" onClick={() => printDocument(item)}>
          Print
        </ActionButton>
      </div>
    </article>
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
