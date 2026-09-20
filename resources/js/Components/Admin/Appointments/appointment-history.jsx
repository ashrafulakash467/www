"use client";

import { useEffect, useMemo, useState } from "react";
import { FaCalendarAlt } from "react-icons/fa";
import { apiFetch } from "@/utils/api";

const PAGE_SIZES = [10, 20, 30, 50, 100];
const STATUS_OPTIONS = [
  ["all", "All Appointments"],
  ["approved", "Approved Appointments"],
  ["rescheduled", "Rescheduled Appointments"],
  ["cancelled", "Cancelled Appointments"],
];

export default function AdminAppointmentHistory() {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();

    apiFetch("/admin/appointments?per_page=100", { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || "Failed to load appointment history.");

        setAppointments(
          (result.doctors ?? []).flatMap((doctor) =>
            (doctor.patients ?? []).map((patient) => ({
              ...patient,
              id: patient.appointmentId,
              patient: { name: patient.name, email: patient.email, phone: patient.phone },
              doctor: { name: doctor.name },
              appointmentDate: patient.date,
              slotTime: patient.time,
            })),
          ),
        );
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => appointments.filter((appointment) => {
    if (selectedDate && appointment.appointmentDate !== selectedDate) return false;
    const status = String(appointment.status ?? "").toLowerCase();
    if (statusFilter === "all") return true;
    if (statusFilter === "approved") return ["approved", "confirmed", "completed"].includes(status);
    if (statusFilter === "rescheduled") return status.includes("reschedule");
    return status === "cancelled";
  }), [appointments, selectedDate, statusFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [selectedDate, statusFilter, pageSize]);

  return (
    <section className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointment History</h1>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span className="inline-flex items-center gap-1"><FaCalendarAlt className="text-emerald-700" /> Select date</span>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-800" />
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Total appointments</p><p className="text-xl font-bold text-emerald-900">{filtered.length}</p></div>
          <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <Select label="Cards per page" value={pageSize} onChange={(value) => setPageSize(Number(value))} options={PAGE_SIZES.map((size) => [size, size])} />
          <button type="button" disabled={!filtered.length} onClick={() => window.print()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">Print</button>
        </div>
      </div>

      {selectedDate ? <button type="button" onClick={() => setSelectedDate("")} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">Clear date filter</button> : null}
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
      {isLoading ? <p className="rounded-xl bg-white p-6 text-sm text-slate-500">Loading appointment history...</p> : visible.length ? (
        <div className="space-y-3">{visible.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} />)}</div>
      ) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No appointment history matches the current filters.</p>}

      {filtered.length > pageSize ? <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Page {page} of {pages} ({filtered.length} appointments)</p><div className="flex gap-2"><PageButton disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</PageButton><PageButton disabled={page === pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>Next</PageButton></div></div> : null}
    </section>
  );
}

function AppointmentCard({ appointment }) {
  const patient = appointment.patient ?? {};
  const doctor = appointment.doctor ?? {};
  return <article className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-lg font-bold text-slate-900">{patient.name || "Patient"}</h2><p className="text-sm text-slate-500">{patient.email || "No email available"}</p></div><Detail label="Doctor" value={doctor.name || "Not available"} /><span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase text-blue-700">{appointment.status || "Pending"}</span></div><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5"><Detail label="Appointment" value={appointment.id} /><Detail label="Date" value={appointment.appointmentDate || "Not set"} /><Detail label="Time" value={appointment.slotTime || "Not set"} /><Detail label="Payment" value={appointment.paymentStatus || "Pending"} /><Detail label="Phone" value={patient.phone || "Not available"} /></div></article>;
}

function Detail({ label, value }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-medium text-slate-800">{value}</p></div>; }
function Select({ label, value, onChange, options }) { return <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-800">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>; }
function PageButton({ children, ...props }) { return <button type="button" {...props} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">{children}</button>; }
