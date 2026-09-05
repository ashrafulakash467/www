"use client";
import Image from "@/Components/Image";
import { Icon } from "../Dashboard_Overview/dashboard-shared";
import { resolveDoctorImageSrc } from "@/Components/shared/DoctorCard";

const PRINT_STYLES = `
  @media print {
    body * { visibility: hidden; }
    .appt-print-area, .appt-print-area * { visibility: visible; }
    .appt-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; }
    .appt-print-hidden { display: none !important; }
    .appt-print-card { break-inside: avoid; page-break-inside: avoid; }
  }
`;

export default function AppointmentViewDoctor({ doctors, onSelectDoctor }) {
  function handlePrint() {
    window.print();
  }

  return (
    <div>
      <style>{PRINT_STYLES}</style>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 appt-print-hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Doctor Appointment List</h2>
          <p className="mt-1 text-sm text-slate-500">
            {doctors.length} doctor{doctors.length === 1 ? "" : "s"} with appointments
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Icon name="download" className="h-4 w-4" />
          Print
        </button>
      </div>

      <div className="appt-print-area space-y-4">
        {doctors.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No doctors with appointments were found.
          </p>
        ) : (
          doctors.map((doctor) => (
            <article
              key={doctor.id}
              className="appt-print-card flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm transition hover:shadow-md md:flex-row md:items-center"
            >
              <div className="flex items-center gap-4 md:w-72 md:shrink-0">
                <DoctorAvatar doctor={doctor} />
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-950">{doctor.name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {doctor.specialty || "General Medicine"}
                  </p>
                </div>
              </div>

              <div className="grid flex-1 grid-cols-1 gap-2 border-slate-100 text-sm text-slate-600 sm:grid-cols-3 md:border-l md:pl-5">
                <ContactDetail label="Email" value={doctor.email || "â€”"} />
                <ContactDetail label="Phone" value={doctor.phone || "â€”"} />
              </div>

              <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                  <Icon name="users" className="h-4 w-4" />
                  {doctor.totalPatients} patient{doctor.totalPatients === 1 ? "" : "s"}
                </div>
                <button
                  type="button"
                  onClick={() => onSelectDoctor(doctor.id)}
                  className="appt-print-hidden inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  View patients
                  <span aria-hidden="true">-</span>
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function DoctorAvatar({ doctor }) {
  const src = resolveDoctorImageSrc(doctor);

  return (
<div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
  {src ? (
    <Image
      src={src}
      alt={doctor?.name || "Doctor"}
      fill
      sizes="56px"
      className="object-cover"
    />
  ) : (
    // fallback
    <div className="flex h-full w-full items-center justify-center">
      Doctor
    </div>
  )}
</div>
  );
}

function ContactDetail({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 truncate font-medium text-slate-800">{value}</p>
    </div>
  );
}

function getInitial(name) {
  return (String(name ?? "").trim().charAt(0) || "?").toUpperCase();
}
