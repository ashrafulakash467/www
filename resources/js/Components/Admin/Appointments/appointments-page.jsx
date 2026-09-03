"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "../Dashboard_Overview/dashboard-shared";
import { apiFetch, getStoredToken } from "@/utils/api";
import AppointmentViewDoctor from "./appointment_view_doctor";
import AppointmentViewPatient from "./appointment_view_patient";

export default function AppointmentsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);

  const loadAppointments = useCallback(() => {
    const token = getStoredToken("admin");

    if (!token) {
      setLoading(false);
      setError("You must be signed in as an admin to view appointments.");
      return undefined;
    }

    setLoading(true);
    setError("");

    const controller = new AbortController();

    apiFetch("/admin/appointments", { signal: controller.signal }, token)
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));

        if (response.ok && Array.isArray(result.doctors)) {
          setDoctors(result.doctors);
        } else {
          setError(result.message ?? "Failed to load appointments from the server.");
        }
      })
      .catch((err) => {
        if (err?.name === "AbortError") {
          return;
        }

        setError("Could not reach the server. Please check your connection and try again.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAppointments();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAppointments]);

  const selectedDoctor =
    doctors.find((doctor) => String(doctor.id) === String(selectedDoctorId)) ?? null;

  function goBack() {
    setSelectedDoctorId(null);
  }

  return (
    <PanelCard
      eyebrow="Appointment Management"
      title={selectedDoctor ? "Patient Appointments" : "Doctor Appointments"}
      description={
        selectedDoctor
          ? ""
          : ""
      }
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={loadAppointments} />
      ) : selectedDoctor ? (
        <AppointmentViewPatient
          patients={selectedDoctor.patients ?? []}
          doctorName={selectedDoctor.name}
          onBack={goBack}
        />
      ) : doctors.length === 0 ? (
        <EmptyState />
      ) : (
        <AppointmentViewDoctor doctors={doctors} onSelectDoctor={setSelectedDoctorId} />
      )}
    </PanelCard>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-slate-500">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      <p className="text-sm font-medium">Loading appointmentsâ€¦</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
      <Icon name="audit" className="h-8 w-8 text-rose-500" />
      <p className="max-w-md text-sm text-rose-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
      >
        Try Again
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <Icon name="appointments" className="h-10 w-10 text-slate-300" />
      <p className="text-sm font-semibold text-slate-700">No appointments yet</p>
      <p className="max-w-md text-sm text-slate-500">
        Once patients book appointments, they will appear here grouped by doctor.
      </p>
    </div>
  );
}

function PanelCard({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-6">{children}</div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
