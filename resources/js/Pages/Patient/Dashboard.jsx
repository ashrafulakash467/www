"use client";

import { useRouter } from "@/utils/navigation";
import { Suspense, useEffect, useState } from "react";
import DashboardOverviewPage from "@/Components/Patient/dashboardoverview-page";
import MyAppointmentPage from "@/Components/Patient/MyAppointment";
import MedicalRecordsPage from "@/Components/Patient/MedicalRecords";
import { apiFetch } from "@/utils/api";
import PatientLayout from "@/Layouts/PatientLayout";

export default function PatientDashboardPage({ patient, activeTab = "dashboard" }) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <PatientDashboardContent initialPatient={patient} activeTab={activeTab} />
    </Suspense>
  );
}

PatientDashboardPage.layout = (page) => <PatientLayout>{page}</PatientLayout>;

function PatientDashboardContent({ initialPatient, activeTab }) {
  const router = useRouter();
  const [patient] = useState(initialPatient ?? null);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken] = useState(() => initialPatient ? "session" : "");
  const [cancellationReasons, setCancellationReasons] = useState({});
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isCancellingId, setIsCancellingId] = useState("");
  const [isPayingId, setIsPayingId] = useState("");
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [doctorContact, setDoctorContact] = useState(null);
  const [doctorContactError, setDoctorContactError] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    async function loadDashboard() {
      try {
        await loadAppointments("session");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  useEffect(() => {
    const hasRefundActivity = appointments.some(
      (appointment) => ["cancellation_requested", "cancelled"].includes(appointment.status)
        && ["processing", "requested"].includes(appointment.refund?.status),
    );
    if (!hasRefundActivity) return undefined;
    const timer = window.setInterval(() => { void loadAppointments(authToken); }, 15000);
    return () => window.clearInterval(timer);
  }, [appointments, authToken]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeTab !== "appointments") {
      return;
    }

    if (!selectedAppointmentId) {
      return;
    }

    const selectedStillExists = appointments.some(
      (appointment) => appointment.id === selectedAppointmentId,
    );

    if (!selectedStillExists) {
      queueMicrotask(() => {
        setSelectedAppointmentId(appointments[0]?.id ?? "");
      });
    }
  }, [activeTab, appointments, selectedAppointmentId]);

  useEffect(() => {
    const selectedAppointment = appointments.find(
      (appointment) => appointment.id === selectedAppointmentId,
    );

    if (!selectedAppointment?.doctor) {
      queueMicrotask(() => {
        setDoctorContact(null);
        setDoctorContactError("");
      });
      return;
    }

    queueMicrotask(() => {
      setDoctorContact(selectedAppointment.doctor);
      setDoctorContactError("");
    });
  }, [appointments, selectedAppointmentId]);

  async function loadAppointments(token) {
    try {
      const response = await apiFetch("/appointment/my", {}, token);
      const result = await response.json();

      if (response.ok) {
        setAppointments(result.appointments ?? []);
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    }
  }

  async function handleCancelAppointment(appointmentId) {
    const reason = (cancellationReasons[appointmentId] ?? "").trim();

    if (!reason) {
      setActionError("Please enter a cancellation reason first.");
      return;
    }

    if (!authToken) {
      setActionError("You need to be logged in to cancel an appointment.");
      return;
    }

    setIsCancellingId(appointmentId);
    setActionError("");
    setActionMessage("");

    try {
      const response = await apiFetch(
        "/appointment/cancel",
        {
          method: "POST",
          body: JSON.stringify({ appointmentId, reason }),
        },
        authToken,
      );
      const result = await response.json();

      if (!response.ok) {
        setActionError(result.message ?? "Could not cancel appointment.");
        return;
      }

      setActionMessage(result.message ?? "Appointment cancelled successfully.");
      setCancellationReasons((currentReasons) => {
        const nextReasons = { ...currentReasons };
        delete nextReasons[appointmentId];
        return nextReasons;
      });
      await loadAppointments(authToken);
    } catch {
      setActionError(
        "Could not cancel appointment. Please check your connection and try again.",
      );
    } finally {
      setIsCancellingId("");
    }
  }

    async function handleDeleteAppointment(appointmentId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this cancelled appointment?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeletingId(appointmentId);
      setActionError("");
      setActionMessage("");

      const response = await apiFetch(
        `/appointments/${appointmentId}`,
        {
          method: "DELETE",
        },
        authToken
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to delete appointment."
        );
      }

      // Remove deleted appointment from your current list
      setAppointments((previousAppointments) =>
        previousAppointments.filter(
          (appointment) => appointment.id !== appointmentId
        )
      );

      setActionMessage("Appointment deleted successfully.");
    } catch (error) {
      console.error("Delete appointment error:", error);

      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to delete appointment."
      );
    } finally {
      setIsDeletingId(null);
    }
  }

  function handlePayAppointment(appointmentId) {
    if (!authToken) {
      setActionError("You need to be logged in to make a payment.");
      return;
    }

    // Redirect to the payment page with the appointment ID in the URL.
    router.push(`/payment?appointmentId=${encodeURIComponent(appointmentId)}`);
  }

  if (isLoading) {
    return <DashboardLoading />;
  }

  return (
    <>
        {activeTab === "dashboard" && (
          <DashboardOverviewPage
            patient={patient}
            appointments={appointments}
            onNavigateRecords={() => router.push("/patient/medical-records")}
            onNavigateAppointments={() => router.push("/patient/appointments")}
            cancellationReasons={cancellationReasons}
            setCancellationReasons={setCancellationReasons}
            handleCancelAppointment={handleCancelAppointment}
            isCancellingId={isCancellingId}
            actionMessage={actionMessage}
            actionError={actionError}
          />
        )}

        {activeTab === "appointments" && (
          <MyAppointmentPage
            appointments={appointments}
            selectedAppointmentId={selectedAppointmentId}
            onSelectAppointment={setSelectedAppointmentId}
            cancellationReasons={cancellationReasons}
            setCancellationReasons={setCancellationReasons}
            handleCancelAppointment={handleCancelAppointment}
            handlePayAppointment={handlePayAppointment}
            handleDeleteAppointment={handleDeleteAppointment}
            isCancellingId={isCancellingId}
            isPayingId={isPayingId}
            actionMessage={actionMessage}
            actionError={actionError}
            setActionError={setActionError}
            setActionMessage={setActionMessage}
            doctorContact={doctorContact}
            doctorContactError={doctorContactError}
            now={now}
          />
        )}

        {activeTab === "records" && <MedicalRecordsPage patient={patient} />}
    </>
  );
}

function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 font-medium text-slate-500">
      Loading dashboard...
    </div>
  );
}
