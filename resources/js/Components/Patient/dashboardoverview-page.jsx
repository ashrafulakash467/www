import { Link } from "@inertiajs/react";
import { InfoCard } from "./dashboard-shared";

export default function DashboardOverviewPage({
  patient,
  appointments,
  onNavigateRecords,
  onNavigateAppointments,
  cancellationReasons,
  setCancellationReasons,
  handleCancelAppointment,
  isCancellingId,
  actionMessage,
  actionError,
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {patient?.name}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Manage your health records and active consultations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onNavigateAppointments}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Open appointment cart
          </button>
          <Link
            href="/find-doctor"
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 shadow-sm"
          >
            Book Appointment
          </Link>
        </div>
      </div>

      {actionError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      {actionMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {actionMessage}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard title="Phone Number" value={patient?.phone || "N/A"} />
        <InfoCard title="Primary Email" value={patient?.email || "N/A"} />
        <InfoCard title="Patient Role" value={patient?.role || "Patient"} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Upcoming Appointments
            </h2>
            <p className="text-sm text-slate-500">
              View and reschedule upcoming consultations.
            </p>
          </div>
        </div>

        {appointments.length === 0 ? (
          <p className="rounded-lg border border-slate-100 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No scheduled appointments found.
          </p>
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <article
                key={appointment.id}
                className="flex flex-col gap-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4 transition hover:border-slate-200 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">
                      {appointment.doctor?.name}
                    </p>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                        appointment.status === "cancelled"
                          ? "bg-red-50 text-red-700"
                          : appointment.status === "confirmed"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {appointment.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {appointment.doctor?.specialty || "Consultation"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {appointment.appointmentDate} at {appointment.slotTime}
                  </p>
                  {appointment.status === "cancelled" &&
                  appointment.cancellationReason ? (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Cancelled reason: {appointment.cancellationReason}
                    </p>
                  ) : null}
                </div>

                <div className="flex w-full flex-col gap-3 sm:w-80">
                  {appointment.isCancellable ? (
                    <textarea
                      value={cancellationReasons[appointment.id] ?? ""}
                      onChange={(event) =>
                        setCancellationReasons((currentReasons) => ({
                          ...currentReasons,
                          [appointment.id]: event.target.value,
                        }))
                      }
                      placeholder="Reason for cancellation"
                      rows={3}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-400"
                    />
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {appointment.isReschedulable ? (
                      <Link
                        href={`/appointment/reschedule?appointmentId=${appointment.id}`}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        Reschedule
                      </Link>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">
                        Not Eligible for Reschedule
                      </span>
                    )}

                    {appointment.isCancellable ? (
                      <button
                        type="button"
                        onClick={() => handleCancelAppointment(appointment.id)}
                        disabled={isCancellingId === appointment.id}
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isCancellingId === appointment.id
                          ? "Cancelling..."
                          : "Cancel"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 p-6">
        <div>
          <h3 className="font-bold text-emerald-950">
            Medical Records Workflow
          </h3>
          <p className="mt-0.5 text-xs text-emerald-800">
            Access prescriptions, test reports, and invoices in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateRecords}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800"
        >
          View Records
        </button>
      </div>
    </div>
  );
}
