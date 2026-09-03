import { formatCurrency } from "./dashboard-shared";
const workflowSteps = [
  {
    title: "Open Appointment",
    detail: "Select today's, upcoming, or pending appointment queue.",
  },
  {
    title: "Review Patient Details",
    detail: "Check the patient profile, timing, and appointment context.",
  },
  {
    title: "Accept / Reject / Reschedule",
    detail: "Decide whether to move forward, decline, or reschedule the visit.",
  },
  {
    title: "Conduct Consultation",
    detail: "Review symptoms, concerns, and clinical observations.",
  },
  {
    title: "Add Clinical Notes",
    detail: "Record diagnosis, treatment plan, and next steps.",
  },
  {
    title: "Issue Prescription",
    detail: "Prepare medication or test instructions after the consultation.",
  },
  {
    title: "Mark Appointment Complete",
    detail: "Close the visit once care is finished.",
  },
  {
    title: "Schedule Follow-up",
    detail: "Set the next visit when the patient needs another review.",
  },
];
function MetricCard({
  label,
  value,
  detail,
  onClick,
  tone = "slate",
  isLoading = false,
}) {
  const toneClasses =
    tone === "green"
          ? "border-black-50 bg-white-50/70 text-black-800 hover:bg-green-300"
          : "border-slate-200 bg-white text-slate-800 hover:bg-green-300";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-busy={isLoading}
      className={`rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneClasses}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-current/70">
        {label}
      </p>
      <div className="mt-2 min-h-9">
        {isLoading ? (
          <span className="block h-9 w-24 animate-pulse rounded-lg bg-slate-200" />
        ) : (
          <p className="text-3xl font-bold text-current">{value}</p>
        )}
      </div>
      <p className="mt-2 text-sm text-current/80">{detail}</p>
    </button>
  );
}

export default function DashboardOverviewPage({
  doctor,
  isDoctorLoading = false,
  isAppointmentsLoading = false,
  isRecordsLoading = false,
  summary = {},
  todayAppointments = [],
  upcomingAppointments = [],
  pendingRequests = [],
  notifications = [],
  records = {},
  onNavigateTab,
}) {
  const patientRecordCount =
    (records.diagnostics?.length ?? 0) +
    (records.notes?.length ?? 0) +
    (records.uploads?.length ?? 0);
  const prescriptionCount = records.prescriptions?.length ?? 0;
  const earningsValue =
    typeof summary.earningsCents === "number"
      ? formatCurrency(summary.earningsCents, summary.currency || "USD")
      : formatCurrency(0, summary.currency || "USD");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Doctor Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Dr.{" "}
            {isDoctorLoading ? (
              <span className="inline-block h-4 w-28 animate-pulse rounded bg-slate-200 align-middle" />
            ) : (
              doctor?.name || "Doctor"
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab("records")}
            className="inline-flex items-center rounded-lg border border-black-500 bg-white px-4 py-2 text-sm font-semibold text-black-500 transition hover:bg-green-300"
          >
            All Doc
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("earnings")}
            className="inline-flex items-center rounded-lg border border-black-500 bg-white px-4 py-2 text-sm font-semibold text-black-500 transition hover:bg-green-300"
          >
            Reports
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("today")}
            className="inline-flex items-center rounded-lg border border-black-500 bg-white px-4 py-2 text-sm font-semibold text-black-500 transition hover:bg-green-300"
          >
            Open Today
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("pending")}
            className="inline-flex items-center rounded-lg border border-black-500 bg-white px-4 py-2 text-sm font-semibold text-black-500 transition hover:bg-green-300"
          >
            Pending Requests
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("schedule")}
            className="inline-flex items-center rounded-lg border border-black-500 bg-white px-4 py-2 text-sm font-semibold text-black-500 transition hover:bg-rgreen-300"
          >
            Manage Schedule
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Today's Appointments"
          value={summary.today ?? todayAppointments.length}
          detail=""
          tone="green"
          isLoading={isAppointmentsLoading}
          onClick={() => onNavigateTab("today")}
        />
        <MetricCard
          label="Upcoming Appointments"
          value={summary.upcoming ?? upcomingAppointments.length}
          detail=""
          tone="green"
          isLoading={isAppointmentsLoading}
          onClick={() => onNavigateTab("upcoming")}
        />
        <MetricCard
          label="Pending Requests"
          value={summary.pending ?? pendingRequests.length}
          detail=""
          tone="green"
          isLoading={isAppointmentsLoading}
          onClick={() => onNavigateTab("pending")}
        />
        <MetricCard
          label="Patient Records"
          value={patientRecordCount}
          detail=""
          tone="green"
          isLoading={isRecordsLoading}
          onClick={() => onNavigateTab("records")}
        />
        <MetricCard
          label="Prescriptions"
          value={prescriptionCount}
          detail=""
          tone="green"
          isLoading={isRecordsLoading}
          onClick={() => onNavigateTab("prescriptions")}
        />
        <MetricCard
          label="Earnings"
          value={earningsValue}
          detail=""
          tone="green"
          isLoading={isAppointmentsLoading}
          onClick={() => onNavigateTab("earnings")}
        />
        <MetricCard
          label="Notifications"
          value={notifications.length}
          detail=""
          tone="green"
          onClick={() => onNavigateTab("notifications")}
        />
        <MetricCard
          label="Settings"
          value={"Update Profile"}
          detail=""
          tone="green"
          onClick={() => onNavigateTab("Settings")}
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Profile Snapshot
          </p>
          <div className="mt-3 space-y-3 text-sm text-slate-600">
            <p>
              <span className="font-semibold text-slate-900">Email:</span>{" "}
              {isDoctorLoading ? <InlineSkeleton /> : doctor?.email || "N/A"}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Phone:</span>{" "}
              {isDoctorLoading ? <InlineSkeleton /> : doctor?.phone || "N/A"}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Specialty:</span>{" "}
              {isDoctorLoading ? (
                <InlineSkeleton />
              ) : (
                doctor?.specialty || "Doctor"
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InlineSkeleton() {
  return (
    <span className="inline-block h-4 w-24 animate-pulse rounded bg-slate-200 align-middle" />
  );
}
