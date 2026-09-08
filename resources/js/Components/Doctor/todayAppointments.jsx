import { useEffect, useState } from "react";
import AppointmentDetailsDrawer from "./appointment-details-drawer";

const PAGE_SIZES = [10, 20, 30, 40, 50, 100];
const PRINT_SIZES = [10, 15, 20, 25, 30];

export default function TodayAppointments({
    appointments = [],
    isLoading = false,
    records = {},
    onMedicalRecordsChanged,
}) {
    const [pageSize, setPageSize] = useState(10);
    const [printSize, setPrintSize] = useState(10);
    const [page, setPage] = useState(1);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const pages = Math.max(1, Math.ceil(appointments.length / pageSize));
    const visible = appointments.slice((page - 1) * pageSize, page * pageSize);

    useEffect(() => setPage(1), [pageSize, appointments.length]);

    function printPatients() {
        const printable = appointments.slice(0, printSize);
        const popup = window.open("", "_blank", "width=1000,height=700");
        if (!popup) return;
        popup.document
            .write(`<!doctype html><html><head><title>Today's Appointments</title><style>
      body{font-family:Arial,sans-serif;padding:24px;color:#172033}h1{margin:0 0 6px}p{color:#64748b}.patient{border:1px solid #cbd5e1;border-radius:10px;padding:14px;margin:10px 0}.row{display:flex;justify-content:space-between;gap:20px}.label{font-size:11px;text-transform:uppercase;color:#64748b}.value{font-weight:600;margin-top:3px}
    </style></head><body><h1>Today's Appointments</h1><p>Printed ${new Date().toLocaleString()} | Showing ${printable.length} patient(s)</p>${printable.map(printablePatient).join("")}</body></html>`);
        popup.document.close();
        popup.focus();
        window.setTimeout(() => {
            popup.print();
            popup.close();
        }, 300);
    }

    return (
        <section className="mx-auto max-w-6xl space-y-5">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Today's Appointments
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage all patient activity scheduled for today.
                    </p>
                </div>
                <div className="flex flex-wrap items-end gap-3 print:hidden">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Patients per page
                        <select
                            value={pageSize}
                            onChange={(e) =>
                                setPageSize(Number(e.target.value))
                            }
                            className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case text-slate-800"
                        >
                            {PAGE_SIZES.map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Print patients
                        <select
                            value={printSize}
                            onChange={(e) =>
                                setPrintSize(Number(e.target.value))
                            }
                            className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case text-slate-800"
                        >
                            {PRINT_SIZES.map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        onClick={printPatients}
                        disabled={!appointments.length}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Print Patient List
                    </button>
                </div>
            </div>
            {isLoading ? (
                <p className="rounded-xl bg-white p-6 text-sm text-slate-500">
                    Loading today's appointments...
                </p>
            ) : visible.length ? (
                <div className="space-y-3">
                    {visible.map((appointment) => (
                        <PatientCard
                            key={appointment.id}
                            appointment={appointment}
                            onView={setSelectedAppointment}
                        />
                    ))}
                </div>
            ) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                    No appointments scheduled for today.
                </p>
            )}
            {appointments.length > pageSize ? (
                <div className="flex items-center justify-between print:hidden">
                    <p className="text-sm text-slate-500">
                        Page {page} of {pages} ({appointments.length} patients)
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                setPage((current) => Math.max(1, current - 1))
                            }
                            disabled={page === 1}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setPage((current) =>
                                    Math.min(pages, current + 1),
                                )
                            }
                            disabled={page === pages}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            ) : null}
            {selectedAppointment ? (
                <AppointmentDetailsDrawer
                    appointment={selectedAppointment}
                    records={records}
                    onClose={() => setSelectedAppointment(null)}
                    onMedicalRecordsChanged={onMedicalRecordsChanged}
                />
            ) : null}
        </section>
    );
}

function PatientCard({ appointment, onView }) {
    const patient = appointment.patient ?? {};
    const doctor = appointment.doctor ?? {};
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">
                        {patient.name || appointment.patientName || "Patient"}
                    </h2>
                    <p className="text-sm text-slate-500">
                        {patient.email || "No email available"}
                    </p>
                </div>
                    <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase text-emerald-700">
                        {appointment.status || "Pending"}
                    </span>
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="mt-2 sm:mt-0">

                <Detail label="Appointment" value={appointment.id} />
                <Detail
                    label="Time"
                    value={appointment.slotTime || "Not set"}
                />
                </div>
                <div className="mt-2 sm:mt-0">
                <Detail
                    label="Consultation"
                    value={
                        appointment.consultationType ||
                        appointment.type ||
                        "Consultation"
                    }
                />
                <Detail
                    label="Payment"
                    value={appointment.paymentStatus || "Pending"}
                />
                </div>
                <div className="mt-2 sm:mt-0">
                <Detail
                    label="Phone"
                    value={patient.phone || "Not available"}
                />
                <Detail label="Doctor" value={doctor.name || "You"} />
                </div>
            
            <div className="m-2 flex justify-end">
                <button
                    type="button"
                    onClick={() => onView(appointment)}
                    className="rounded-lg bg-slate-900 py-2 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                    View
                </button>
            </div>
            </div>
        </article>
    );
}

function Detail({ label, value }) {
    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <p className="mt-1 font-medium text-slate-800">{value}</p>
        </div>
    );
}

function printablePatient(appointment) {
    const patient = appointment.patient ?? {};
    return `<article class="patient"><div class="row"><div><div class="label">Patient</div><div class="value">${escapeHtml(patient.name || appointment.patientName || "Patient")}</div></div><div><div class="label">Status</div><div class="value">${escapeHtml(appointment.status || "Pending")}</div></div></div><div class="row"><div><div class="label">Appointment</div><div class="value">${escapeHtml(appointment.id || "")}</div></div><div><div class="label">Time</div><div class="value">${escapeHtml(appointment.slotTime || "Not set")}</div></div><div><div class="label">Phone</div><div class="value">${escapeHtml(patient.phone || "Not available")}</div></div></div></article>`;
}

function escapeHtml(value) {
    return String(value).replace(
        /[&<>"']/g,
        (character) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;",
            })[character],
    );
}
