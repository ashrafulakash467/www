"use client";

import { useEffect, useState } from "react";
import { apiFetch, getStoredToken } from "@/utils/api";
import {
  formatCurrency,
  formatTimeLeft,
  getPaymentTone,
  parseAppointmentDateTime,
  InfoCard,
} from "./dashboard-shared";

export default function PendingRequestPage({
  appointments = [],
  selectedAppointmentId,
  onSelectAppointment,
  now,
  onAppointmentsChanged,
}) {
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [loadingAction, setLoadingAction] = useState(null);

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
    appointments.find(
      (appointment) => appointment.id === selectedAppointmentId,
    ) ?? null;

  async function handleAction(appointmentId, decision) {
    const token = getStoredToken("doctor");

    if (!token) {
      window.location.replace("/doctor/login");
      return;
    }

    setLoadingAction({ appointmentId, decision });
    setActionMessage("");
    setActionError("");

    try {
      const response = await apiFetch(
        "/appointment/decision",
        {
          method: "POST",
          body: JSON.stringify({
            appointmentId,
            decision,
          }),
        },
        token,
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setActionError(result.message ?? "Could not update the appointment.");
        return;
      }

      setActionMessage(result.message ?? "Appointment updated successfully.");
      await onAppointmentsChanged?.();
    } catch {
      setActionError(
        "Could not update the appointment. Please check your connection and try again.",
      );
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Pending Requests
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Review each request and process the exact patient row you select.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          {appointments.length} waiting
        </span>
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

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Pending Queue
              </h2>
            </div>
          </div>

          {appointments.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No pending requests right now.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {appointments.map((appointment) => {
                const isSelected = appointment.id === selectedAppointmentId;
                const isPatientChangeRequest = Boolean(appointment.changeRequest);
                const isLoading =
                  loadingAction?.appointmentId === appointment.id;
                const slotStart = parseAppointmentDateTime(
                  appointment.appointmentDate,
                  appointment.slotTime,
                );
                const countdown = slotStart
                  ? formatTimeLeft(slotStart.getTime() - now)
                  : "Unavailable";

                return (
                  <article
                    key={appointment.id}
                    className={`rounded-2xl border p-4 shadow-sm transition ${
                      isSelected
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-900 hover:-translate-y-0.5 hover:shadow-md"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectAppointment(appointment.id)}
                      className="w-full text-left"
                    >
                      <div className="flex gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={`text-sm font-bold ${
                                isSelected ? "text-white" : "text-slate-900"
                              }`}
                            >
                              {appointment.patient?.name ||
                                appointment.patientName ||
                                "Patient"}
                            </p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusTone(
                                appointment.status,
                              )}`}
                            >
                              {appointment.status || "pending"}
                            </span>
                          </div>
                          <p
                            className={`text-xs ${
                              isSelected ? "text-slate-200" : "text-slate-500"
                            }`}
                          >
                            {appointment.doctor?.specialty || "Consultation"}
                          </p>
                          <p
                            className={`text-xs ${
                              isSelected ? "text-slate-200" : "text-slate-500"
                            }`}
                          >
                            {appointment.appointmentDate} at {appointment.slotTime}
                          </p>
                          {appointment.changeRequest?.type === "reschedule" ? (
                            <p
                              className={`mt-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
                                isSelected
                                  ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
                                  : "border-amber-200 bg-amber-50 text-amber-800"
                              }`}
                            >
                              Requested: {appointment.changeRequest.appointment_date} at{" "}
                              {appointment.changeRequest.slot_time}
                            </p>
                          ) : null}
                        </div>

                        <div className={`space-y-1 text-right ${isSelected ? "text-slate-100" : ""}`}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-current/70">
                            Time left
                          </p>
                          <p className="text-sm font-bold text-current">
                            {countdown}
                          </p>
                          <p
                            className={`text-[11px] font-semibold uppercase tracking-wide ${
                              isSelected
                                ? "text-white"
                                : getPaymentTone(appointment.paymentStatus)
                            }`}
                          >
                            {appointment.paymentStatus || "unpaid"}
                          </p>
                        </div>
                      </div>
                    </button>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleAction(appointment.id, "accepted")}
                        disabled={isLoading}
                        className="rounded-md border border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isLoading && loadingAction?.decision === "accepted"
                          ? "Accepting..."
                          : isPatientChangeRequest
                            ? "Accept request"
                            : "Accept"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(appointment.id, "rejected")}
                        disabled={isLoading}
                        className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isLoading && loadingAction?.decision === "rejected"
                          ? "Rejecting..."
                          : isPatientChangeRequest
                            ? "Reject request"
                            : "Reject"}
                      </button>
                      {!isPatientChangeRequest ? (
                        <button
                          type="button"
                          onClick={() => handleAction(appointment.id, "reschedule")}
                          disabled={isLoading}
                          className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isLoading && loadingAction?.decision === "reschedule"
                            ? "Sending..."
                            : "Reschedule"}
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {selectedAppointment ? (
            <>
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedAppointment.patient?.name ||
                      selectedAppointment.patientName ||
                      "Patient"}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusTone(
                      selectedAppointment.status,
                    )}`}
                  >
                    {selectedAppointment.status || "pending"}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {selectedAppointment.doctor?.specialty || "Consultation"}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoCard
                  title="Appointment Date"
                  value={selectedAppointment.appointmentDate}
                />
                <InfoCard title="Slot Time" value={selectedAppointment.slotTime} />
                <InfoCard title="Time Left" value={selectedTimeLeft(now, selectedAppointment)} />
                <InfoCard
                  title="Payment"
                  value={`${selectedAppointment.paymentStatus || "unpaid"} - ${formatCurrency(
                    selectedAppointment.paymentAmountCents,
                    selectedAppointment.paymentCurrency,
                  )}`}
                />
              </div>

              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Request Details
                </p>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold text-slate-900">Reason:</span>{" "}
                    {selectedAppointment.reason || "Not provided"}
                  </p>
                  {selectedAppointment.changeRequest ? (
                    <p>
                      <span className="font-semibold text-slate-900">Patient request:</span>{" "}
                      {selectedAppointment.changeRequest.type === "reschedule"
                        ? `Reschedule to ${selectedAppointment.changeRequest.appointment_date} at ${selectedAppointment.changeRequest.slot_time}`
                        : "Cancellation"}
                    </p>
                  ) : null}
                  <p>
                    <span className="font-semibold text-slate-900">Phone:</span>{" "}
                    {selectedAppointment.patient?.phone || "Unavailable"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Email:</span>{" "}
                    {selectedAppointment.patient?.email || "Unavailable"}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleAction(selectedAppointment.id, "accepted")
                  }
                  disabled={loadingAction?.appointmentId === selectedAppointment.id}
                  className="rounded-md border border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingAction?.appointmentId === selectedAppointment.id &&
                  loadingAction?.decision === "accepted"
                    ? "Accepting..."
                    : "Accept request"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAction(selectedAppointment.id, "rejected")
                  }
                  disabled={loadingAction?.appointmentId === selectedAppointment.id}
                  className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingAction?.appointmentId === selectedAppointment.id &&
                  loadingAction?.decision === "rejected"
                    ? "Rejecting..."
                    : "Reject request"}
                </button>
                {!selectedAppointment.changeRequest ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleAction(selectedAppointment.id, "reschedule")
                    }
                    disabled={loadingAction?.appointmentId === selectedAppointment.id}
                    className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingAction?.appointmentId === selectedAppointment.id &&
                    loadingAction?.decision === "reschedule"
                      ? "Sending..."
                      : "Move to reschedule"}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex min-h-115 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
              <div className="max-w-sm space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Open a pending request
                </h3>
                <p className="text-sm text-slate-500">
                  Select a patient from the left to review the booking details
                  and process the request.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function statusTone(status) {
  const value = String(status ?? "").toLowerCase();

  if (value.includes("confirmed") || value.includes("accepted")) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (value.includes("cancelled") || value.includes("rejected")) {
    return "bg-red-50 text-red-700";
  }

  if (value.includes("reschedule") || value.includes("pending")) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-blue-50 text-blue-700";
}

function selectedTimeLeft(now, appointment) {
  const slotStart = parseAppointmentDateTime(
    appointment.appointmentDate,
    appointment.slotTime,
  );

  return slotStart
    ? formatTimeLeft(slotStart.getTime() - now)
    : "Unavailable";
}
