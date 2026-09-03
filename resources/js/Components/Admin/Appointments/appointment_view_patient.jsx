"use client";

import { useMemo, useState } from "react";
import { Icon } from "../Dashboard_Overview/dashboard-shared";

const PRINT_STYLES = `
  @media print {
    body * { visibility: hidden; }
    .appt-print-area, .appt-print-area * { visibility: visible; }
    .appt-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; }
    .appt-print-hidden { display: none !important; }
    .appt-print-card { break-inside: avoid; page-break-inside: avoid; }
  }
`;

const STATUS_OPTIONS = [
  { value: "all", label: "All Patients" },
  { value: "cancelled", label: "Cancelled Patients" },
  { value: "pending", label: "Pending Patients" },
  { value: "confirmed", label: "Confirmed Patients" },
];

export default function AppointmentViewPatient({
  patients,
  doctorName,
  onBack,
}) {
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return (patients ?? []).filter((patient) => {
      if (selectedDate && patient.date !== selectedDate) {
        return false;
      }

      if (!matchesStatus(patient.status, statusFilter)) {
        return false;
      }

      return true;
    });
  }, [patients, selectedDate, statusFilter]);

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      <style>{PRINT_STYLES}</style>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 appt-print-hidden">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          <span aria-hidden="true">←</span>
          All Doctors
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Icon name="download" className="h-4 w-4" />
          Print
        </button>
      </div>

      <div className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 appt-print-hidden sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Filter by date
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-44 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-800 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mb-5 appt-print-hidden">
        <h2 className="text-xl font-bold text-slate-950">
          {doctorName ? `${doctorName} — Patients` : "Patient Appointment List"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Showing {filtered.length} of {patients?.length ?? 0} appointment
          {patients?.length === 1 ? "" : "s"}
          {selectedDate ? ` on ${selectedDate}` : ""}
        </p>
      </div>

      <div className="appt-print-area">
        <div className="mb-4 hidden print:block">
          <p className="text-lg font-bold text-slate-950">
            {doctorName ? `${doctorName} — Patient Appointment List` : "Patient Appointment List"}
          </p>
          <p className="text-sm text-slate-600">
            Generated {new Date().toLocaleString()}
            {selectedDate ? ` — Filtered by date: ${selectedDate}` : ""}
            {statusFilter !== "all" ? ` — Status: ${statusFilter}` : ""}
          </p>
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No patients match the current filters. Try changing the date or status.
          </p>
        ) : (
          <div className="space-y-4">
            {filtered.map((patient) => (
              <PatientRow key={patient.appointmentId ?? patient.patientId} patient={patient} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PatientRow({ patient }) {
  const schedule = [patient.date, patient.time].filter(Boolean).join(" • ");

  return (
    <article className="appt-print-card flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm transition hover:shadow-md lg:flex-row lg:items-center">
      <div className="flex items-center gap-3 lg:w-56 lg:shrink-0">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-base font-bold text-slate-600">
          {getInitial(patient.name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-950">{patient.name}</p>
          <p className="truncate text-sm text-slate-500">{patient.type || "Consultation"}</p>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-x-6 gap-y-2 border-slate-100 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3 lg:border-l lg:pl-5">
        <ContactDetail label="Phone" value={patient.phone || "—"} />
        <ContactDetail label="Email" value={patient.email || "—"} />
        <ContactDetail label="Age" value={patient.age != null ? `${patient.age} yrs` : "—"} />
        <ContactDetail label="Schedule" value={schedule || "—"} />
        <ContactDetail label="Address" value={patient.address || "—"} className="sm:col-span-2 lg:col-span-2" />
      </div>

      <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end">
       <Badge tone={patient.paymentStatus}><spam>Payment :</spam>{patient.paymentStatus}</Badge>
        <Badge tone={patient.status}><spam>Status :</spam>{patient.status || "Pending"}</Badge>
      </div>
    </article>
  );
}



function ContactDetail({ label, value, className = "" }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 truncate font-medium text-slate-800">{value}</p>
    </div>
  );
}

function matchesStatus(status, filter) {
  const value = String(status ?? "").toLowerCase();

  if (filter === "all") {
    return true;
  }

  if (filter === "active") {
    return !value.includes("cancel");
  }

  return value.includes(filter);
}

function Badge({ children, tone }) {
  const resolved = badgeTone(tone);
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${resolved}`}
    >
      {children}
    </span>
  );
}

function badgeTone(value) {
  const text = String(value ?? "").toLowerCase();

  if (
    text.includes("paid") ||
    text.includes("settled") ||
    text.includes("completed") ||
    text.includes("confirmed") ||
    text.includes("approved")
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    text.includes("pending") ||
    text.includes("review") ||
    text.includes("partial") ||
    text.includes("refund")
  ) {
    return "bg-amber-50 text-amber-700";
  }

  if (text.includes("cancel") || text.includes("reject") || text.includes("fail")) {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getInitial(name) {
  return (String(name ?? "").trim().charAt(0) || "?").toUpperCase();
}
