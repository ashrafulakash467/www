import { formatCurrency } from "../Dashboard_Overview/dashboard-shared";

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

function MetricCard({ label, value, detail, onClick, tone = "slate" }) {
  const toneClasses =
    tone === "emerald"
      ? "border-emerald-100 bg-emerald-50/70 text-emerald-800"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50/70 text-amber-800"
        : tone === "blue"
          ? "border-blue-100 bg-blue-50/70 text-blue-800"
          : "border-slate-200 bg-white text-slate-800";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneClasses}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-current/70">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-current">{value}</p>
      <p className="mt-2 text-sm text-current/80">{detail}</p>
    </button>
  );
}

export default function DashboardOverviewPage({
  doctor,
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
            Welcome back, Dr. {doctor?.name}. Follow the consultation flow from
            review to follow-up.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab("today")}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Open Today
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("pending")}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Pending Requests
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("schedule")}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Manage Schedule
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Today's Appointments"
          value={summary.today ?? todayAppointments.length}
          detail="Appointments ready for consultation today."
          tone="blue"
          onClick={() => onNavigateTab("today")}
        />
        <MetricCard
          label="Upcoming Appointments"
          value={summary.upcoming ?? upcomingAppointments.length}
          detail="Future consultations that need preparation."
          tone="slate"
          onClick={() => onNavigateTab("upcoming")}
        />
        <MetricCard
          label="Pending Requests"
          value={summary.pending ?? pendingRequests.length}
          detail="Requests waiting for accept, reject, or reschedule."
          tone="amber"
          onClick={() => onNavigateTab("pending")}
        />
        <MetricCard
          label="Patient Records"
          value={patientRecordCount}
          detail="Diagnostic reports, notes, and uploads."
          tone="emerald"
          onClick={() => onNavigateTab("records")}
        />
        <MetricCard
          label="Prescriptions"
          value={prescriptionCount}
          detail="Medication files and prescription history."
          tone="blue"
          onClick={() => onNavigateTab("prescriptions")}
        />
        <MetricCard
          label="Earnings"
          value={earningsValue}
          detail="Total paid consultation revenue."
          tone="emerald"
          onClick={() => onNavigateTab("earnings")}
        />
        <MetricCard
          label="Notifications"
          value={notifications.length}
          detail="Alerts, reminders, and pending updates."
          tone="amber"
          onClick={() => onNavigateTab("notifications")}
        />
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Profile Snapshot
          </p>
          <div className="mt-3 space-y-3 text-sm text-slate-600">
            <p>
              <span className="font-semibold text-slate-900">Email:</span>{" "}
              {doctor?.email || "N/A"}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Phone:</span>{" "}
              {doctor?.phone || "N/A"}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Specialty:</span>{" "}
              {doctor?.specialty || "Doctor"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Consultation Flow
              </h2>
              <p className="text-sm text-slate-500">
                This is the exact working sequence for the doctor dashboard.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {workflowSteps.map((step, index) => (
              <div
                key={step.title}
                className="flex gap-4 rounded-lg border border-slate-100 bg-slate-50/60 p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Notifications
              </h2>
              <p className="text-sm text-slate-500">
                Track follow-ups, queue changes, and remaining tasks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("notifications")}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Open list
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {notifications.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                No notifications right now.
              </p>
            ) : (
              notifications.map((item) => (
                <article
                  key={item.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-4"
                >
                  <h3 className="text-sm font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.message}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
