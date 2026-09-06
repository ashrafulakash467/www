import { useState } from "react";
import { saveDocumentRecord } from "@/utils/medical-records";

const DOCUMENT_CATEGORIES = [
  { title: "Prescription", type: "pdf" },
  { title: "Diagnostic Reports", type: "report" },
  { title: "Invoice", type: "invoice" },
];

const MAX_DOCUMENT_FILE_SIZE = 20 * 1024 * 1024;

export default function AppointmentDetailsDrawer({
  appointment,
  records = {},
  onClose,
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
  const [isSaving, setIsSaving] = useState(false);

  if (!appointment) return null;

  const patient = appointment.patient ?? {};
  const doctor = appointment.doctor ?? {};
  const documents = [...(records.invoices ?? []), ...(records.uploads ?? [])].filter(
    (item) => String(item.appointmentId ?? item.appointment_id) === String(appointment.id),
  );

  function handleCategoryChange(event) {
    const category = DOCUMENT_CATEGORIES.find((item) => item.title === event.target.value);
    setTitle(category?.title || "Prescription");
    setDocumentType(category?.type || "pdf");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (documentFile?.size > MAX_DOCUMENT_FILE_SIZE) {
      setError("The document must be 20 MB or smaller.");
      return;
    }

    if (!documentFile && !documentUrl.trim() && documentType !== "invoice") {
      setError("Attach a PDF/file or provide a document URL.");
      return;
    }

    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      await saveDocumentRecord({
        appointmentId: appointment.id,
        title: title.trim(),
        documentType,
        notes: notes.trim() || undefined,
        referenceNo: referenceNo.trim() || undefined,
        documentDate,
        amountCents: documentType === "invoice" ? amountCents : undefined,
        documentUrl: documentUrl.trim() || undefined,
        documentFile: documentFile ?? undefined,
      });

      setMessage("Document uploaded successfully.");
      setReferenceNo("");
      setNotes("");
      setAmountCents("");
      setDocumentUrl("");
      setDocumentFile(null);
      await onMedicalRecordsChanged?.();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not upload document.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white p-6 shadow-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-details-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Appointment Details</p>
            <h2 id="appointment-details-title" className="mt-1 text-xl font-bold text-slate-900">
              {patient.name || appointment.patientName || "Patient"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50" aria-label="Close appointment details">
            X
          </button>
        </div>

        <div className="flex-1 space-y-5 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              {appointment.status || "Pending"}
            </span>
            <span className="text-sm text-slate-500">{appointment.consultationType || appointment.type || "Consultation"}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Appointment ID" value={appointment.id} />
            <Info label="Date" value={appointment.appointmentDate || "Not set"} />
            <Info label="Time" value={appointment.slotTime || "Not set"} />
            <Info label="Payment" value={appointment.paymentStatus || "Pending"} />
            <Info label="Payment amount" value={formatAmount(appointment)} />
            <Info label="Doctor" value={doctor.name || "You"} />
            <Info label="Patient phone" value={patient.phone || "Not available"} />
            <Info label="Patient email" value={patient.email || "Not available"} />
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Additional information</p>
            <p className="mt-2"><strong className="text-slate-900">Reason:</strong> {appointment.reason || "Not provided"}</p>
            <p className="mt-2"><strong className="text-slate-900">Notes:</strong> {appointment.notes || appointment.description || "Not provided"}</p>
          </div>

          <section className="rounded-xl border border-slate-200 p-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Upload Document</h3>
              <p className="mt-1 text-sm text-slate-500">Attach a prescription, diagnostic report, invoice, or note to this appointment.</p>
            </div>

            {documents.length ? (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Uploaded documents</p>
                {documents.map((item) => <p key={item.id} className="mt-1">{item.title || "Document"} - {item.documentDate || item.date || "No date"}</p>)}
              </div>
            ) : null}

            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold text-slate-700">Document category
                  <select value={title} onChange={handleCategoryChange} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700">
                    {DOCUMENT_CATEGORIES.map((category) => <option key={category.title} value={category.title}>{category.title}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-semibold text-slate-700">Reference number
                  <input value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} placeholder="Optional reference number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
                </label>
                <label className="space-y-2 text-sm font-semibold text-slate-700">Document date
                  <input type="date" value={documentDate} onChange={(event) => setDocumentDate(event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
                </label>
                {documentType === "invoice" ? <label className="space-y-2 text-sm font-semibold text-slate-700">Invoice amount
                  <input type="number" min="0" value={amountCents} onChange={(event) => setAmountCents(event.target.value)} placeholder="Amount in cents" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
                </label> : null}
              </div>
              <label className="block space-y-2 text-sm font-semibold text-slate-700">File URL or upload
                <input type="url" value={documentUrl} onChange={(event) => setDocumentUrl(event.target.value)} placeholder="Optional public document URL" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:font-semibold file:text-white" />
              </label>
              <label className="block space-y-2 text-sm font-semibold text-slate-700">Notes
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Optional notes" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
              </label>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                <button type="submit" disabled={isSaving} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Uploading..." : "Upload Document"}</button>
              </div>
            </form>
          </section>
        </div>
      </aside>
    </div>
  );
}

function Info({ label, value }) {
  return <div className="rounded-lg border border-slate-100 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-slate-800">{value || "Not available"}</p></div>;
}

function formatAmount(appointment) {
  if (appointment.paymentAmountCents == null) return "Not available";
  return `${(Number(appointment.paymentAmountCents) / 100).toFixed(2)} ${String(appointment.paymentCurrency || "USD").toUpperCase()}`;
}
