"use client";

import { Link } from "@inertiajs/react";
import { useMemo, useState } from "react";
import { FaCalendarAlt, FaEye, FaTimesCircle } from "react-icons/fa";
import {
  InfoCard,
  formatCurrency,
  formatTimeLeft,
  getPaymentTone,
  getStatusTone,
  parseAppointmentDateTime,
} from "@/Components/Patient/dashboard-shared";

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
  setActionError,
  setActionMessage,
  doctorContact,
  doctorContactError,
  now,
}) {
  const [appointmentFilter, setAppointmentFilter] = useState("today");
  const [hasSelectedAppointmentFilter, setHasSelectedAppointmentFilter] = useState(false);

  function getCancellationReason(appointmentId) {
    return String(cancellationReasons[appointmentId] ?? "").trim();
  }

  function handleToggleDetails(appointmentId) {
    onSelectAppointment(selectedAppointmentId === appointmentId ? "" : appointmentId);
  }

  function handlePayClick(appointmentId) {
    if (typeof handlePayAppointment === "function") {
      void handlePayAppointment(appointmentId);
    }
  }
  function handleCancelClick(appointment) {
    const reason = getCancellationReason(appointment.id);

    if (!reason) {
      onSelectAppointment(appointment.id);
      if (typeof setActionError === "function") {
      }
      if (typeof setActionMessage === "function") {
        setActionMessage("");
      }
      return;
    }

    if (typeof handleCancelAppointment === "function") {
      void handleCancelAppointment(appointment.id);
    }
  }

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

  const summary = useMemo(() => {
    const total = appointments.length;

    return {
      total,
      upcoming: appointments.filter((appointment) => {
        const appointmentStart = parseAppointmentDateTime(
          appointment.appointmentDate,
          appointment.slotTime,
        );

        if (!appointmentStart) {
          return appointment.status !== "cancelled";
        }

        return appointment.status !== "cancelled" && appointmentStart.getTime() >= now;
      }).length,
      cancelled: appointments.filter(
        (appointment) => String(appointment.status ?? "").toLowerCase() === "cancelled",
      ).length,
    };
  }, [appointments, now]);

  const today = new Date(now).toISOString().slice(0, 10);
  const hasTodayAppointments = appointments.some(
    (appointment) =>
      appointment.appointmentDate === today &&
      String(appointment.status ?? "").toLowerCase() !== "cancelled",
  );
  const hasUpcomingAppointments = appointments.some(
    (appointment) =>
      appointment.appointmentDate > today &&
      String(appointment.status ?? "").toLowerCase() !== "cancelled",
  );
  const visibleAppointmentFilter =
    !hasSelectedAppointmentFilter &&
    appointmentFilter === "today" &&
    !hasTodayAppointments &&
    hasUpcomingAppointments
      ? "upcoming"
      : appointmentFilter;

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const status = String(appointment.status ?? "").toLowerCase();

      if (visibleAppointmentFilter === "all") {
        return true;
      }

      if (visibleAppointmentFilter === "cancelled") {
        return status === "cancelled";
      }

      if (visibleAppointmentFilter === "rescheduled") {
        return Boolean(appointment.rescheduledAt);
      }

      if (visibleAppointmentFilter === "today") {
        return appointment.appointmentDate === today && status !== "cancelled";
      }

      return appointment.appointmentDate > today && status !== "cancelled";
    });
  }, [appointments, today, visibleAppointmentFilter]);

  function handleFilterChange(event) {
    setHasSelectedAppointmentFilter(true);
    setAppointmentFilter(event.target.value);
    onSelectAppointment("");
  }

  return (
    <PanelCard
    title="Booked Appointments"
    >
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          <InfoCard title="Total Bookings" value={summary.total} />
          <InfoCard title="Upcoming" value={summary.upcoming} />
          <InfoCard title="Cancelled" value={summary.cancelled} />
          <div>
              <Link
                href="/find-doctor"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Book Another Appointment
              </Link>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Appointment type</p>
          </div>
          <select
            value={visibleAppointmentFilter}
            onChange={handleFilterChange}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 sm:w-56"
            aria-label="Filter appointments by type"
          >
            <option value="today">Today&apos;s Appointments</option>
            <option value="all">All Bookings</option>
            <option value="upcoming">Upcoming</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="cancelled">Cancelled</option>
          </select>
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

        {appointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
            <h3 className="text-lg font-bold text-slate-900">
              No booked appointments yet
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Once you book a doctor visit, it will appear here as a card.
            </p>
            <Link
              href="/find-doctor"
              className="mt-5 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Find Doctors
            </Link>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
            <h3 className="text-lg font-bold text-slate-900">
              No {visibleAppointmentFilter === "today" ? "appointments today" : "matching appointments"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Select another appointment type to view more bookings.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map((appointment) => {
              const isSelected = appointment.id === selectedAppointmentId;
              const appointmentStart = parseAppointmentDateTime(
                appointment.appointmentDate,
                appointment.slotTime,
              );
              const countdown = appointmentStart
                ? formatTimeLeft(appointmentStart.getTime() - now)
                : "Unavailable";
              const doctorName = appointment.doctor?.name ?? "Unnamed Doctor";
              const doctorSpecialty = appointment.doctor?.specialty ?? "General Practice";
              const isPaymentComplete = ["paid", "completed", "settled"].includes(
                String(appointment.paymentStatus ?? "").toLowerCase(),
              );
              const rescheduleInfo = appointment.rescheduleInfo ?? null;
              const rescheduleStatus = rescheduleInfo?.status ?? "not_requested";
              const rescheduleHint = rescheduleInfo
                ? `${rescheduleInfo.appointmentDate} at ${rescheduleInfo.slotTime}`
                : "No reschedule update";

              return (
                <article
                  key={appointment.id}
                  className={`w-full rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? "border-emerald-200 bg-[#c8f7e6] text-slate-900 shadow-md"
                      : "border-slate-200 bg-[#f4f5f7] text-slate-900"
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                          isSelected
                            ? "border-emerald-200 bg-white/70 text-emerald-800"
                            : "border-emerald-100 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {getInitials(doctorName)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`truncate text-sm font-bold ${
                              isSelected ? "text-slate-950" : "text-slate-900"
                            }`}
                          >
                            {doctorName}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusTone(
                              appointment.status,
                            )}`}
                          >
                            {formatStatusLabel(appointment.status)}
                          </span>
                        </div>

                        <p
                          className={`mt-0.5 truncate text-xs ${
                            isSelected ? "text-slate-700" : "text-slate-500"
                          }`}
                        >
                          {doctorSpecialty}
                        </p>

                        <p
                          className={`mt-0.5 truncate text-xs ${
                            isSelected ? "text-slate-600" : "text-slate-400"
                          }`}
                        >
                          {appointment.appointmentDate} at {appointment.slotTime}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4 lg:min-w-[430px]">
                      <MetaBlock
                        selected={isSelected}
                        label="Time left"
                        value={countdown}
                        hint={appointmentStart ? "Live countdown" : "Unavailable"}
                      />
                      <MetaBlock
                        selected={isSelected}
                        label="Payment"
                        value={appointment.paymentStatus ?? "unknown"}
                        hint={formatCurrency(
                          appointment.paymentAmountCents,
                          appointment.paymentCurrency,
                        )}
                        tone={getPaymentTone(appointment.paymentStatus)}
                      />
                      <MetaBlock
                        selected={isSelected}
                        label="Booking"
                        value={appointment.status ?? "unknown"}
                        hint={
                          appointment.isChangeRequestPending
                            ? "Doctor review pending"
                            : appointment.canRequestReschedule
                              ? "Change request available"
                              : appointment.isReschedulable
                                ? "Reschedulable"
                                : "Locked"
                        }
                        tone={getStatusTone(appointment.status)}
                      />
                      <MetaBlock
                        selected={isSelected}
                        label="Reschedule"
                        value={formatStatusLabel(rescheduleStatus)}
                        hint={rescheduleHint}
                        tone={getRescheduleTone(rescheduleStatus)}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => handleToggleDetails(appointment.id)}
                      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                        isSelected
                          ? "border-emerald-200 bg-white text-slate-900 shadow-sm hover:bg-emerald-50"
                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
                      }`}
                    >
                      <FaEye className="text-sm" />
                      {isSelected ? "Hide" : "View"}
                    </button>

                    {appointment.isReschedulable || appointment.canRequestReschedule ? (
                      <Link
                        href={`/appointment/reschedule?appointmentId=${appointment.id}`}
                        className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                          isSelected
                            ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            : "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100"
                        }`}
                      >
                        <FaCalendarAlt className="text-sm" />
                        {appointment.canRequestReschedule ? "Request reschedule" : "Reschedule"}
                      </Link>
                    ) : (
                      <span
                        className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                          isSelected
                            ? "border-emerald-200 text-slate-600"
                            : "border-slate-200 text-slate-400"
                        }`}
                      >
                        Not eligible for reschedule
                      </span>
                    )}

                    {!isPaymentComplete &&
                    appointment.status !== "cancelled" ? (
                      <button
                        type="button"
                        onClick={() => handlePayClick(appointment.id)}
                        disabled={isPayingId === appointment.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span>
                          {isPayingId === appointment.id ? "Processing..." : "Pay Now"}
                        </span>
                      </button>
                    ) : (
                      <span className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400">
                        {isPaymentComplete
                          ? "Payment complete"
                          : "Payment unavailable"}
                      </span>
                    )}

                    {appointment.isChangeRequestPending ? (
                      <span className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                        Doctor review pending
                      </span>
                    ) : appointment.isCancellable || appointment.canRequestCancellation ? (
                      <button
                        type="button"
                        onClick={() => handleCancelClick(appointment)}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition-all duration-200 hover:border-rose-300 hover:bg-rose-100"
                      >
                        <FaTimesCircle className="text-sm" />
                        {appointment.canRequestCancellation ? "Request cancellation" : "Cancel"}
                      </button>
                    ) : null}
                  </div>

                  {isSelected ? (
                    <div className="mt-4 grid gap-4 rounded-2xl border border-emerald-100 bg-[#dff9ef] p-4 text-slate-900">
                      <div className="flex flex-col gap-2 border-b border-emerald-100 pb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-bold text-slate-950">
                            {doctorName}
                          </h4>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusTone(
                              appointment.status,
                            )}`}
                          >
                            {formatStatusLabel(appointment.status)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">
                          {doctorSpecialty}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <InfoCard title="Appointment Date" value={appointment.appointmentDate ?? "N/A"} />
                        <InfoCard title="Slot Time" value={appointment.slotTime ?? "N/A"} />
                        <InfoCard title="Time Left" value={selectedTimeLeft} />
                        <InfoCard
                          title="Payment"
                          value={`${appointment.paymentStatus ?? "unknown"} - ${formatCurrency(
                            appointment.paymentAmountCents,
                            appointment.paymentCurrency,
                          )}`}
                        />
                      </div>

                      <div className="rounded-xl border border-emerald-100 bg-white/80 p-4">
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
                              href={`mailto:${doctorContact.email}?subject=${encodeURIComponent(
                                `Question about appointment ${appointment.id}`,
                              )}&body=${encodeURIComponent(
                                `Hello Dr. ${doctorContact.name},\n\nI have a question about my appointment on ${appointment.appointmentDate} at ${appointment.slotTime}.\n\nThank you.`,
                              )}`}
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

                      {appointment.isChangeRequestPending ? (
                        <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4 text-sm text-amber-800">
                          <p className="font-semibold">Doctor review pending</p>
                          <p className="mt-1">
                            {appointment.changeRequest?.type === "reschedule"
                              ? "Your reschedule request is waiting for doctor approval."
                              : "Your cancellation request is waiting for doctor approval."}
                          </p>
                        </div>
                      ) : appointment.isCancellable || appointment.canRequestCancellation ? (
                        <div className="rounded-xl border border-rose-100 bg-white/80 p-4">
                          <label className="block text-sm font-semibold text-slate-700">
                            {appointment.canRequestCancellation
                              ? "Cancellation request reason"
                              : "Cancellation reason"}
                            <textarea
                              value={cancellationReasons[appointment.id] ?? ""}
                              onChange={(event) => {
                                if (typeof setActionError === "function") {
                                  setActionError("");
                                }

                                setCancellationReasons((currentReasons) => ({
                                  ...currentReasons,
                                  [appointment.id]: event.target.value,
                                }));
                              }}
                              placeholder="Tell us why you need to cancel this appointment"
                              rows={4}
                              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                            />
                          </label>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleCancelClick(appointment)}
                              disabled={isCancellingId === appointment.id}
                              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <FaTimesCircle className="text-sm" />
                              {isCancellingId === appointment.id
                                ? appointment.canRequestCancellation
                                  ? "Submitting request..."
                                  : "Cancelling..."
                                : appointment.canRequestCancellation
                                  ? "Submit cancellation request"
                                  : "Cancel appointment"}
                            </button>

                            {appointment.isReschedulable || appointment.canRequestReschedule ? (
                              <Link
                                href={`/appointment/reschedule?appointmentId=${appointment.id}`}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                {appointment.canRequestReschedule
                                  ? "Request reschedule instead"
                                  : "Reschedule instead"}
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                          This appointment cannot be changed at the moment.
                        </p>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </PanelCard>
  );
}

function PanelCard({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function MetaBlock({ label, value, hint, selected = false, tone = "" }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        selected ? "border-emerald-100 bg-white/70" : "border-slate-100 bg-white"
      }`}
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${
          selected ? "text-slate-500" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-bold ${
          selected ? tone || "text-slate-950" : tone || "text-slate-900"
        }`}
      >
        {value}
      </p>
      <p
        className={`mt-0.5 text-xs ${
          selected ? "text-slate-600" : "text-slate-500"
        }`}
      >
        {hint}
      </p>
    </div>
  );
}

function getInitials(name) {
  const trimmed = String(name ?? "").trim();

  if (!trimmed) {
    return "D";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "D";
  const second = parts[1]?.charAt(0) ?? "";

  return `${first}${second}`.toUpperCase();
}

function formatStatusLabel(status) {
  const text = String(status ?? "").trim();

  if (!text) {
    return "Active";
  }

  return text.replace(/_/g, " ").replace(/(^|\s)\w/g, (match) => match.toUpperCase());
}

function getRescheduleTone(status) {
  const value = String(status ?? "").toLowerCase();

  if (value === "accepted") {
    return "text-emerald-700";
  }

  if (value === "rejected") {
    return "text-red-700";
  }

  if (value === "pending") {
    return "text-amber-700";
  }

  return "text-slate-500";
}
