"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/utils/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare, faCalendarDays } from "@fortawesome/free-solid-svg-icons";
import DashboardOverviewPage from "./dashboardoverview-page";
import DashboardHeader from "@/Components/Dashboard/header";
import MyAppointmentPage from "./myappointment-page";
import TodayAppointments from "./todayAppointments";
import UpcomingAppointment from "./upcomingAppointment";
import PendingRequestPage from "./pending-request";
import PatientRecordsPage from "./patientRecords";
import UploadDocumentPage from "./upload-document";
import ScheduleManagementPage from "./schedule-management-page";
import { apiFetch, clearAllAuthSessions, getStoredToken, getStoredUser } from "@/utils/api";
import {
  createMedicalRecordsChannel,
  emptyMedicalRecords,
  fetchMedicalRecords,
} from "@/utils/medical-records";
import SettingsPage from "./Settings-page";
import SidebarShell from "@/Components/Dashboard/SidebarShell";
import { doctorSidebarItems } from "@/Components/Dashboard/sidebar-config";
import { Icon } from "./dashboard-shared";

  const notificationsSeed = [
  {
    id: "note-1",
    title: "New consultation request",
    message: "One patient is waiting for review this morning.",
  },
  {
    id: "note-2",
    title: "Follow-up reminder",
    message: "Two patients are due for follow-up scheduling today.",
  },
  {
    id: "note-3",
    title: "Earnings update",
    message: "Your earnings summary is ready for review.",
  },
  ];

function renderDoctorSidebarIcon(item) {
  if (item.key === "today") {
    return (
      <FontAwesomeIcon
        icon={faCalendarDays}
        className="h-4 w-4 shrink-0"
        style={{ width: "1rem", height: "1rem" }}
      />
    );
  }

  if (item.key === "visit-site") {
    return (
      <FontAwesomeIcon
        icon={faArrowUpRightFromSquare}
        className="h-4 w-4 shrink-0"
        style={{ width: "1rem", height: "1rem" }}
      />
    );
  }

  return <Icon name={item.icon} className="h-5 w-5" />;
}

function isDoctorSidebarItemActive(item, activeTab, recordCategory) {
  if (item.key === "records") {
    return activeTab === "records";
  }

  if (item.key === "documents") {
    return activeTab === "documents";
  }

  return activeTab === item.key;
}


export default function DoctorDashboardClient() {
  const router = useRouter();
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isDoctorLoading, setIsDoctorLoading] = useState(true);
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(true);
  const [isRecordsLoading, setIsRecordsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => window.localStorage.getItem("healthcare.doctor.activeTab") ?? "dashboard");
  const [recordCategory, setRecordCategory] = useState("prescriptions");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [records, setRecords] = useState(emptyMedicalRecords());

  useEffect(() => {
    window.localStorage.setItem("healthcare.doctor.activeTab", activeTab);
  }, [activeTab]);

  function loadAppointments(token = getStoredToken("doctor")) {
    return apiFetch("/appointment/my", {}, token)
      .then((response) => response.json().then((result) => ({ response, result })))
      .then(({ response, result }) => {
        if (response.ok) {
          setAppointments(result.appointments ?? []);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch appointments:", error);
      });
  }

  async function loadMedicalRecords() {
    try {
      const nextRecords = await fetchMedicalRecords("doctor");
      setRecords(nextRecords);
    } catch (error) {
      console.error("Failed to fetch medical records:", error);
      setRecords(emptyMedicalRecords());
    }
  }

  useEffect(() => {
    async function loadDoctor() {
      const token = getStoredToken("doctor");

      if (!token) {
        window.location.replace("/doctor/login");
        return;
      }

      const cachedDoctor = getStoredUser("doctor");
      if (cachedDoctor) {
        setDoctor(cachedDoctor);
        setIsDoctorLoading(false);
      }

      function loadDashboardData() {
        return Promise.all([
          loadAppointments(token).finally(() => setIsAppointmentsLoading(false)),
          loadMedicalRecords().finally(() => setIsRecordsLoading(false)),
        ]);
      }

      try {
        const response = await apiFetch("/doctor/me", {}, token);
        const result = await response.json();

        if (!response.ok) {
          window.location.replace("/doctor/login");
          return;
        }

        setDoctor(result.user ?? null);
        setIsDoctorLoading(false);
        await loadDashboardData();
      } catch {
        if (cachedDoctor) {
          await loadDashboardData();
        }
      } finally {
        setIsDoctorLoading(false);
        setIsAppointmentsLoading(false);
        setIsRecordsLoading(false);
      }
    }

    loadDoctor();
  }, []);

  useEffect(() => {
    const channel = createMedicalRecordsChannel();
    if (channel) {
      channel.onmessage = () => {
        loadMedicalRecords();
      };
    }

    return () => {
      channel?.close();
    };
  }, [doctor?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeTab !== "pending") {
      return undefined;
    }

    let isActive = true;
    const token = getStoredToken("doctor");

    const refreshPendingRequests = async () => {
      try {
        const response = await apiFetch("/appointment/my", {}, token);
        const result = await response.json();

        if (isActive && response.ok) {
          setAppointments(result.appointments ?? []);
        }
      } catch (error) {
        console.error("Failed to refresh pending requests:", error);
      }
    };

    refreshPendingRequests();
    const timer = window.setInterval(refreshPendingRequests, 15_000);
    window.addEventListener("focus", refreshPendingRequests);

    return () => {
      isActive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshPendingRequests);
    };
  }, [activeTab]);

  useEffect(() => {
    if (!selectedAppointmentId) {
      const firstAppointment = getAppointmentsForActiveTab(activeTab, appointments)[0];
      if (firstAppointment) {
        queueMicrotask(() => setSelectedAppointmentId(firstAppointment.id));
      }
      return;
    }

    const visibleAppointments = getAppointmentsForActiveTab(activeTab, appointments);
    const stillVisible = visibleAppointments.some(
      (appointment) => appointment.id === selectedAppointmentId,
    );

    if (!stillVisible && visibleAppointments[0]) {
      queueMicrotask(() => setSelectedAppointmentId(visibleAppointments[0].id));
    }
  }, [activeTab, appointments, selectedAppointmentId]);

  const todayString = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter(
    (appointment) => appointment.appointmentDate === todayString,
  );
  const upcomingAppointments = appointments.filter(
    (appointment) => appointment.appointmentDate > todayString,
  );
  const pendingRequests = appointments.filter(
    (appointment) => isPendingRequest(appointment),
  );
  const paidAppointmentTotal = appointments.filter(
    (appointment) => (appointment.paymentStatus ?? "").toLowerCase() === "paid",
  ).length * 12500;
  const notificationItems = notificationsSeed.map((item, index) => ({
    ...item,
    id: `${item.id}-${index}`,
    detail: item.message,
  }));
  const workflowSteps = [
    {
      title: "Open Appointment",
      detail: "Select the appointment from today's, upcoming, or pending queues.",
    },
    {
      title: "Review Patient Details",
      detail: "Check the booking information and supporting records.",
    },
    {
      title: "Accept / Reject / Reschedule",
      detail: "Confirm the consultation, decline it, or move it to another slot.",
    },
    {
      title: "Conduct Consultation",
      detail: "Carry out the live consultation and capture the clinical discussion.",
    },
    {
      title: "Add Clinical Notes",
      detail: "Document your observations, assessment, and treatment plan.",
    },
    {
      title: "Issue Prescription",
      detail: "Generate prescriptions or instructions for the patient.",
    },
    {
      title: "Mark Appointment Complete",
      detail: "Close the consultation once everything has been addressed.",
    },
    {
      title: "Schedule Follow-up",
      detail: "Set the next review date if the patient needs one.",
    },
  ];

  function handleTabChange(nextTab) {
    if (nextTab === "prescriptions") {
      setRecordCategory("prescriptions");
      setActiveTab("records");
      return;
    }

    if (nextTab === "settings") {
      setActiveTab("settings");
      return;
    }

    if (nextTab === "records") {
      setRecordCategory("prescriptions");
      setActiveTab("records");
      return;
    }

    if (nextTab === "documents") {
      setActiveTab("documents");
      return;
    }

    setActiveTab(nextTab);
  }

  function handleSidebarItemClick(item) {
    if (item.key === "visit-site") {
      window.location.href = "/";
      return;
    }

    handleTabChange(item.key);
  }

  async function handleLogout() {
    await apiFetch("/logout", { method: "POST" });
    clearAllAuthSessions();
    router.replace("/doctor/login");
  }

  const isActiveTabLoading =
    (["today", "upcoming", "pending", "earnings"].includes(activeTab) &&
      isAppointmentsLoading) ||
    (activeTab === "records" && isRecordsLoading) ||
    (activeTab === "documents" &&
      (isAppointmentsLoading || isRecordsLoading)) ||
    (activeTab === "schedule" && isDoctorLoading);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <DashboardHeader
        user={doctor}
        title="Doctor Dashboard"
        subtitle={doctor?.specialty ? `Dr. ${doctor.name}.` : "Welcome back."}
        roleLabel="Doctor"
        onLogout={handleLogout}
      />

      <div className="flex h-[calc(100vh-5rem)] w-full overflow-hidden flex-row">
        <SidebarShell
          title="Doctor Dashboard"
          subtitle="Manage appointments, records, earnings, and settings."
          roleLabel="Doctor"
          items={doctorSidebarItems}
          activeKey={activeTab}
          isItemActive={(item) => isDoctorSidebarItemActive(item, activeTab, recordCategory)}
          renderIcon={renderDoctorSidebarIcon}
          user={doctor}
          onLogout={handleLogout}
          onItemClick={handleSidebarItemClick}
        />

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTab === "dashboard" && (
          <DashboardOverviewPage
            doctor={doctor}
            isDoctorLoading={isDoctorLoading}
            isAppointmentsLoading={isAppointmentsLoading}
            isRecordsLoading={isRecordsLoading}
            records={records}
            todayAppointments={todayAppointments}
            upcomingAppointments={upcomingAppointments}
            pendingRequests={pendingRequests}
            paidAppointmentTotal={paidAppointmentTotal}
            notifications={notificationItems}
            workflowSteps={workflowSteps}
            onNavigateSection={handleTabChange}
            onNavigateTab={handleTabChange}

          />
        )}

        {activeTab !== "dashboard" && isActiveTabLoading ? (
          <DoctorContentSkeleton />
        ) : (
          <>
        {activeTab === "settings" && (
          <SettingsPage />

        )}

        {activeTab === "today" && (
          <TodayAppointments
            appointments={todayAppointments}
            isLoading={isAppointmentsLoading}
          />
        )}

        {activeTab === "upcoming" && (
          <UpcomingAppointment
            appointments={upcomingAppointments}
            isLoading={isAppointmentsLoading}
          />
        )}

        {activeTab === "pending" && (
          <PendingRequestPage
            appointments={pendingRequests}
            selectedAppointmentId={selectedAppointmentId}
            onSelectAppointment={setSelectedAppointmentId}
            now={now}
            onAppointmentsChanged={loadAppointments}
          />
        )}

        {activeTab === "records" && (
          <PatientRecordsPage
            title={
              recordCategory === "prescriptions"
                ? "Prescriptions"
                : "Patient Records"
            }
            description={
              recordCategory === "prescriptions"
                ? "Medication files and prescription history."
                : "Diagnostic reports, notes, uploads, and invoices for your patients."
            }
            records={records}
            recordCategory={recordCategory}
            setRecordCategory={setRecordCategory}
          />
        )}

        {activeTab === "documents" && (
          <UploadDocumentPage
            appointments={appointments}
            selectedAppointmentId={selectedAppointmentId}
            onSelectAppointment={setSelectedAppointmentId}
            records={records}
            now={now}
            onMedicalRecordsChanged={loadMedicalRecords}
          />
        )}

        {activeTab === "schedule" && (
          <ScheduleManagementPage
            doctor={doctor}
            onNavigateSection={handleTabChange}
          />
        )}

        {activeTab === "earnings" && (
          <EarningsPanel
            summary={{
              earningsCents: paidAppointmentTotal,
              pending: pendingRequests.length,
            }}
            appointments={appointments}
            onNavigateTab={handleTabChange}
          />
        )}

        {activeTab === "notifications" && (
          <NotificationsPanel
            notifications={notificationItems}
            onNavigateTab={handleTabChange}
          />
        )}
          </>
        )}
        </main>
      </div>
    </div>
  );
}

function DoctorContentSkeleton() {
  return (
    <div
      className="mx-auto max-w-6xl animate-pulse space-y-8"
      role="status"
      aria-label="Loading dashboard content"
    >
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <div className="h-7 w-52 rounded-lg bg-slate-200" />
          <div className="h-4 w-72 max-w-full rounded bg-slate-200" />
        </div>
        <div className="h-10 w-36 rounded-lg bg-slate-200" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-32 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="h-4 w-28 rounded bg-slate-200" />
            <div className="mt-4 h-7 w-20 rounded bg-slate-200" />
            <div className="mt-4 h-3 w-full rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-5 w-40 rounded bg-slate-200" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-16 rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function getAppointmentsForActiveTab(activeTab, appointments) {
  const todayString = new Date().toISOString().slice(0, 10);

  if (activeTab === "today") {
    return appointments.filter(
      (appointment) => appointment.appointmentDate === todayString,
    );
  }

  if (activeTab === "upcoming") {
    return appointments.filter(
      (appointment) => appointment.appointmentDate > todayString,
    );
  }

  if (activeTab === "pending") {
    return appointments.filter((appointment) => isPendingRequest(appointment));
  }

  return appointments;
}

function isPendingRequest(appointment) {
  return ["pending", "cancellation_requested", "reschedule_requested"].includes(
    String(appointment?.status ?? "").toLowerCase(),
  );
}

function EarningsPanel({ summary, appointments, onNavigateTab }) {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Earnings</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Review appointment revenue and payout status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab("dashboard")}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Back to dashboard
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Estimated earnings
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            ${(summary.earningsCents / 100).toFixed(0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total appointments
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {appointments.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pending requests
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {summary.pending}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Revenue notes</h2>
        <p className="mt-2 text-sm text-slate-500">
          This section can later be wired to real payout analytics, but the
          dashboard flow is already in place.
        </p>
      </section>
    </div>
  );
}

function NotificationsPanel({ notifications, onNavigateTab }) {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Keep an eye on new requests, reminders, and follow-ups.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab("dashboard")}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Back to dashboard
        </button>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            No notifications right now.
          </p>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-bold text-slate-900">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500">{item.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
