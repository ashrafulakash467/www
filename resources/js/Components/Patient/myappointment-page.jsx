import { Link } from "@inertiajs/react";
import {
  InfoCard,
  formatCurrency,
  formatTimeLeft,
  getPaymentTone,
  getStatusTone,
  parseAppointmentDateTime,
} from "./dashboard-shared";
import {
  FaEye,
  FaCalendarAlt,
  FaTimesCircle,
} from "react-icons/fa";

export default function MyAppointmentPage({
  appointments,
  selectedAppointmentId,
  onSelectAppointment,
  cancellationReasons,
  setCancellationReasons,
  handleCancelAppointment,
  handlePayAppointment,
  isCancellingId,
  isPayingId,
  actionMessage,
  actionError,
  doctorContact,
  doctorContactError,
  now,
}) {
  const selectedAppointment =
    appointments.find(
      (appointment) => appointment.id === selectedAppointmentId,
    ) ?? null;
  const selectedStart = selectedAppointment
    ? parseAppointmentDateTime(
        selectedAppointment.appointmentDate,
        selectedAppointment.slotTime,
      )
    : null;
  const selectedTimeLeft = selectedStart
    ? formatTimeLeft(selectedStart.getTime() - now)
    : "Unavailable";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Appointment Cart
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Click a booking to open its details, countdown, payment, and contact
            actions.
          </p>
        </div>
        <Link
          href="/find-doctor"
          className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          Book Another Appointment
        </Link>
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

      <div className="">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Booked appointments
              </h2>
              <p className="text-sm text-slate-500">
                Choose one cart to see the full detail panel.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {appointments.length} total
            </span>
          </div>

          {appointments.length === 0 ? (
            <p className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No booked appointments yet.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {appointments.map((appointment) => {
                const isSelected = appointment.id === selectedAppointmentId;
                const slotStart = parseAppointmentDateTime(
                  appointment.appointmentDate,
                  appointment.slotTime,
                );
                const countdown = slotStart
                  ? formatTimeLeft(slotStart.getTime() - now)
                  : "Unavailable";

                return (
                  <div
                    key={appointment.id}
                    className={`w-full rounded-xl border p-4 text-left`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">
                            {appointment.doctor?.name}
                          </p>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusTone(appointment.status)}`}
                          >
                            {appointment.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {appointment.doctor?.specialty}
                        </p>
                        <p className="text-xs text-slate-500">
                          {appointment.appointmentDate} at{" "}
                          {appointment.slotTime}
                        </p>
                      </div>

                      <div className="space-y-1 text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Time left
                        </p>
                        <p className="text-sm font-bold text-slate-900">
                          {countdown}
                        </p>
                        <p
                          className={`text-[11px] font-semibold uppercase tracking-wide ${getPaymentTone(appointment.paymentStatus)}`}
                        >
                          {appointment.paymentStatus}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">

                      {/* View */}
                      <button
                        type="button"
                        onClick={() => onSelectAppointment(appointment.id)}
                        className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-600 text-white shadow-md"
                            : "border-slate-300 bg-white text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                      >
                        <FaEye className="text-sm" />
                      </button>

                      {/* Reschedule */}
                      {appointment.isReschedulable && (
                        <Link
                          href={`/appointment/reschedule?appointmentId=${appointment.id}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-all duration-200 hover:border-blue-300 hover:bg-blue-100"
                        >
                          <FaCalendarAlt className="text-sm" />
                        
                        </Link>
                      )}

                      {/* Cancel */}
                      {appointment.isCancellable && (
                        <button
                          type="button"
                          onClick={() => handleCancelAppointment(appointment.id)}
                          disabled={isCancellingId === appointment.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-all duration-200 hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <FaTimesCircle className="text-sm" />
                          {isCancellingId === appointment.id
                            ? "Cancelling..."
                            : ""}
                        </button>
                      )}

                    </div>
                 </div>
                );
              })}
            </div>
          )}
        </section>


      </div>
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {selectedAppointment ? (
            <>
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedAppointment.doctor?.name}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusTone(selectedAppointment.status)}`}
                  >
                    {selectedAppointment.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {selectedAppointment.doctor?.specialty}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoCard
                  title="Appointment Date"
                  value={selectedAppointment.appointmentDate}
                />
                <InfoCard
                  title="Slot Time"
                  value={selectedAppointment.slotTime}
                />
                <InfoCard title="Time Left" value={selectedTimeLeft} />
                <InfoCard
                  title="Payment"
                  value={`${selectedAppointment.paymentStatus} - ${formatCurrency(
                    selectedAppointment.paymentAmountCents,
                    selectedAppointment.paymentCurrency,
                  )}`}
                />
              </div>

              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Doctor Contact
                </p>
                {doctorContactError ? (
                  <p className="mt-2 text-sm text-amber-700">
                    {doctorContactError}
                  </p>
                ) : doctorContact ? (
                  <div className="mt-2 space-y-1 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">
                      {doctorContact.name}
                    </p>
                    <p>Email: {doctorContact.email || "Not available"}</p>
                    <p>Phone: {doctorContact.phone || "Not available"}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Loading doctor contact details...
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {doctorContact?.email ? (
                    <a
                      href={`mailto:${doctorContact.email}?subject=${encodeURIComponent(`Question about appointment ${selectedAppointment.id}`)}&body=${encodeURIComponent(`Hello Dr. ${doctorContact.name},\n\nI have a question about my appointment on ${selectedAppointment.appointmentDate} at ${selectedAppointment.slotTime}.\n\nThank you.`)}`}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Message by email
                    </a>
                  ) : null}

                  {doctorContact?.phone ? (
                    <a
                      href={`tel:${doctorContact.phone}`}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Call doctor
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {selectedAppointment.isReschedulable ? (
                    <Link
                      href={`/appointment/reschedule?appointmentId=${selectedAppointment.id}`}
                      className="rounded-md border border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-brand-foreground"
                    >
                      Reschedule
                    </Link>
                  ) : (
                    <span className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400">
                      Not eligible for reschedule
                    </span>
                  )}

                  {selectedAppointment.isCancellable ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleCancelAppointment(selectedAppointment.id)
                      }
                      disabled={isCancellingId === selectedAppointment.id}
                      className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCancellingId === selectedAppointment.id
                        ? "Cancelling..."
                        : "Cancel appointment"}
                    </button>
                  ) : (
                    <span className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400">
                      Cannot cancel now
                    </span>
                  )}

                  {selectedAppointment.paymentStatus !== "paid" &&
                  selectedAppointment.status !== "cancelled" ? (
                    <button
                      type="button"
                      onClick={() =>
                        handlePayAppointment(selectedAppointment.id)
                      }
                      disabled={
                        isPayingId === selectedAppointment.id ||
                        selectedAppointment.paymentStatus === "pending"
                      }
                      className="rounded-md border border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPayingId === selectedAppointment.id
                        ? "Processing..."
                        : "Pay now"}
                    </button>
                  ) : (
                    <span className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400">
                      {selectedAppointment.paymentStatus === "paid"
                        ? "Payment complete"
                        : "Payment unavailable"}
                    </span>
                  )}
                </div>

                {selectedAppointment.isCancellable ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <label className="block text-sm font-semibold text-slate-700">
                      Cancellation reason
                      <textarea
                        value={
                          cancellationReasons[selectedAppointment.id] ?? ""
                        }
                        onChange={(event) =>
                          setCancellationReasons((currentReasons) => ({
                            ...currentReasons,
                            [selectedAppointment.id]: event.target.value,
                          }))
                        }
                        placeholder="Tell us why you need to cancel this appointment"
                        rows={4}
                        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </label>
                  </div>
                ) : null}
              </div>

              {selectedAppointment.status === "cancelled" &&
              selectedAppointment.cancellationReason ? (
                <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Cancelled reason: {selectedAppointment.cancellationReason}
                </p>
              ) : null}
            </>
          ) : (
            <div className="flex min-h-[460px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
              <div className="max-w-sm space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Open an appointment cart
                </h3>
                <p className="text-sm text-slate-500">
                  Click any appointment card on the left to see its countdown,
                  payment status, reschedule option, and contact actions.
                </p>
              </div>
            </div>
          )}
        </section>
    </div>
  );
}
