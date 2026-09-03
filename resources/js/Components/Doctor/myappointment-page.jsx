"use client";

import { useEffect, useState } from "react";
import {
  InfoCard,
  formatCurrency,
  formatTimeLeft,
  getPaymentTone,
  getStatusTone,
  parseAppointmentDateTime,
} from "./dashboard-shared";
import {
  saveConsultationMemo,
  savePrescriptionRecord,
} from "@/utils/medical-records";

const workflowSteps = [
  "Open Appointment",
  "Review Patient Details",
  "Accept / Reject / Reschedule",
  "Conduct Consultation",
  "Add Clinical Notes",
  "Issue Prescription",
  "Mark Appointment Complete",
  "Schedule Follow-up",
];

export default function MyAppointmentPage({
  appointments,
  selectedAppointmentId,
  onSelectAppointment,
  mode,
  now,
  onMedicalRecordsChanged,
  onNavigateTab,
}) {
  const [decisionById, setDecisionById] = useState({});
  const [notesById, setNotesById] = useState({});
  const [prescriptionsById, setPrescriptionsById] = useState({});
  const [followUpsById, setFollowUpsById] = useState({});
  const [workflowMessage, setWorkflowMessage] = useState("");
  const [workflowError, setWorkflowError] = useState("");

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

  const selectedStart = selectedAppointment
    ? parseAppointmentDateTime(
        selectedAppointment.appointmentDate,
        selectedAppointment.slotTime,
      )
    : null;
  const selectedTimeLeft = selectedStart
    ? formatTimeLeft(selectedStart.getTime() - now)
    : "Unavailable";

  const activeDecision = selectedAppointment
    ? decisionById[selectedAppointment.id] ??
      selectedAppointment.status ??
      "pending"
    : "";

  const appointmentName = selectedAppointment
    ? selectedAppointment.patient?.name ||
      selectedAppointment.patientName ||
      selectedAppointment.doctor?.name ||
      "Patient"
    : "";

  const notesValue = selectedAppointment
    ? notesById[selectedAppointment.id] ?? ""
    : "";
  const prescriptionValue = selectedAppointment
    ? prescriptionsById[selectedAppointment.id] ?? ""
    : "";
  const followUpValue = selectedAppointment
    ? followUpsById[selectedAppointment.id] ?? ""
    : "";

  function updateDecision(nextDecision) {
    if (!selectedAppointment) {
      return;
    }

    setDecisionById((current) => ({
      ...current,
      [selectedAppointment.id]: nextDecision,
    }));
    setWorkflowMessage(`Marked ${appointmentName} as ${nextDecision}.`);
    setWorkflowError("");
  }

  async function saveNotes() {
    if (!selectedAppointment) {
      return;
    }

    if (!notesValue.trim()) {
      setWorkflowError("Add clinical notes before saving.");
      return;
    }

    try {
      await saveConsultationMemo({
        appointmentId: selectedAppointment.id,
        notes: notesValue.trim(),
        chiefComplaint: appointmentName,
        treatmentPlan: prescriptionValue.trim() || null,
      });
      setWorkflowMessage(`Saved notes for ${appointmentName}.`);
      setWorkflowError("");
      await onMedicalRecordsChanged?.();
    } catch (error) {
      setWorkflowError(
        error instanceof Error ? error.message : "Could not Provide notes.",
      );
    }
  }

  async function issuePrescription() {
    if (!selectedAppointment) {
      return;
    }

    if (!prescriptionValue.trim()) {
      setWorkflowError("Write the prescription before issuing it.");
      return;
    }

    try {
      await savePrescriptionRecord({
        appointmentId: selectedAppointment.id,
        prescription: prescriptionValue.trim(),
        notes: notesValue.trim() || undefined,
      });
      setWorkflowMessage(`Prescription issued for ${appointmentName}.`);
      setWorkflowError("");
      await onMedicalRecordsChanged?.();
    } catch (error) {
      setWorkflowError(
        error instanceof Error ? error.message : "Could not Provide prescription.",
      );
    }
  }

  function completeAppointment() {
    if (!selectedAppointment) {
      return;
    }

    setDecisionById((current) => ({
      ...current,
      [selectedAppointment.id]: "completed",
    }));
    setWorkflowMessage(`Appointment completed for ${appointmentName}.`);
    setWorkflowError("");
  }

  function scheduleFollowUp() {
    if (!selectedAppointment) {
      return;
    }

    if (!followUpValue) {
      setWorkflowError("Select a follow-up date first.");
      return;
    }

    setWorkflowMessage(`Follow-up scheduled for ${appointmentName} on ${followUpValue}.`);
    setWorkflowError("");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {mode === "today"
              ? "Today's Appointments"
              : mode === "upcoming"
                ? "Upcoming Appointments"
                : "Pending Requests"}
          </h1>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {appointments.length} total
        </span>
      </div>

      {workflowError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {workflowError}
        </p>
      ) : null}

      {workflowMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {workflowMessage}
        </p>
      ) : null}

      <div className="grid gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Open Appointment
              </h2>
            </div>
          </div>

          {appointments.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No appointments found for this section.
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
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={() => {
                      onSelectAppointment(appointment.id);
                      setWorkflowMessage(
                        `Opened ${
                          appointment.patient?.name ||
                          appointment.patientName ||
                          appointment.doctor?.name ||
                          "appointment"
                        }.`,
                      );
                      setWorkflowError("");
                    }}
                    className={`w-full rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                      isSelected
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-900"
                    }`}
                  >
                    <div className="flex gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`text-sm font-bold ${isSelected ? "text-white" : "text-slate-900"}`}>
                            {appointment.patient?.name ||
                              appointment.patientName ||
                              appointment.doctor?.name ||
                              "Patient"}
                          </p>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                              isSelected
                                ? "bg-white/10 text-white"
                                : getStatusTone(appointment.status)
                            }`}
                          >
                            {appointment.status || "pending"}
                          </span>
                        </div>
                        <p className={`text-xs ${isSelected ? "text-slate-200" : "text-slate-500"}`}>
                          {appointment.doctor?.specialty || "Clinical review"}
                        </p>
                        <p className={`text-xs ${isSelected ? "text-slate-200" : "text-slate-500"}`}>
                          {appointment.appointmentDate} at {appointment.slotTime}
                        </p>
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
                    {appointmentName}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusTone(
                      activeDecision,
                    )}`}
                  >
                    {activeDecision}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {selectedAppointment.doctor?.specialty || "Consultation"}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard
                  title="Patient Name"
                  value={
                    selectedAppointment.patient?.name ||
                    selectedAppointment.patientName ||
                    "Patient"
                  }
                />
                <InfoCard
                  title="Patient Email"
                  value={selectedAppointment.patient?.email || "Unavailable"}
                />
                <InfoCard
                  title="Patient Phone"
                  value={selectedAppointment.patient?.phone || "Unavailable"}
                />
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
                  value={`${selectedAppointment.paymentStatus || "unpaid"} - ${formatCurrency(
                    selectedAppointment.paymentAmountCents,
                    selectedAppointment.paymentCurrency,
                  )}`}
                />
              </div>

              <div className="mt-5 space-y-4">            
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    value={followUpValue}
                    onChange={(event) =>
                      setFollowUpsById((current) => ({
                        ...current,
                        [selectedAppointment.id]: event.target.value,
                      }))
                    }
                    type="date"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                  <button
                    type="button"
                    onClick={scheduleFollowUp}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Schedule Follow-up
                  </button>
                </div>

                    <div className="flex width-full gap-4 justify-center">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    Add Clinical Notes
                    <textarea
                      value={notesValue}
                      onChange={(event) =>
                        setNotesById((current) => ({
                          ...current,
                          [selectedAppointment.id]: event.target.value,
                        }))
                      }
                      placeholder="Write consultation notes, observations, and next steps"
                      rows={4}
                      className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={saveNotes}
                    className="mt-3 inline-flex items-center justify-center bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
                  >
                    Provide Notes
                  </button>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    Upload Prescription
                    <textarea
                      value={prescriptionValue}
                      onChange={(event) =>
                        setPrescriptionsById((current) => ({
                          ...current,
                          [selectedAppointment.id]: event.target.value,
                        }))
                      }
                      placeholder="Medication instructions or treatment plan"
                      rows={4}
                      className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={issuePrescription}
                    className="mt-3 inline-flex items-center justify-center bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
                  >
                    Provide Prescription
                  </button>
                </div>
                      </div>
              <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.("documents")}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Upload Document
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDecision("reschedule")}
                    className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDecision("consulting")}
                    className="rounded-md border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-200"
                  >
                    Conduct Consultation
                  </button>
                  <button
                    type="button"
                    onClick={completeAppointment}
                    className="rounded-md border border-amber-600 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-200"
                  >
                    Open For Messageing
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[460px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
              <div className="max-w-sm space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Open an appointment
                </h3>
                <p className="text-sm text-slate-500">
                  Select a request on the left to begin the consultation flow.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
