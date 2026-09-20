"use client";

import { useState } from "react";
import AppointmentReport from "./appointment-report";
import DoctorReport from "./doctor-report";
import PatientReport from "./patient-report";
import PaymentReport from "./payment-report";
import RefundReport from "./refund-report";
import EarningsCommissionReport from "./earnings-commission-report";
import MedicalRecordReport from "./medical-record-report";
import AuditReport from "./audit-report";
import SupportReport from "./support-report";
import DateSummaryReport from "./date-summary-report";

const REPORTS = [
  { key: "appointments", title: "Appointment Report", description: "Total, confirmed, cancelled, rescheduled, and completed appointments.", accent: "bg-blue-50 text-blue-700", component: AppointmentReport },
  { key: "doctors", title: "Doctor Report", description: "Verification, pending reviews, specialty distribution, and activity.", accent: "bg-emerald-50 text-emerald-700", component: DoctorReport },
  { key: "patients", title: "Patient Report", description: "Total patients, new registrations, and active users.", accent: "bg-violet-50 text-violet-700", component: PatientReport },
  { key: "payments", title: "Payment Report", description: "Paid, pending, failed payments, and total revenue.", accent: "bg-cyan-50 text-cyan-700", component: PaymentReport },
  { key: "refunds", title: "Refund Report", description: "Requested, approved, rejected, and processed refunds.", accent: "bg-rose-50 text-rose-700", component: RefundReport },
  { key: "earnings", title: "Earnings & Commission Report", description: "Doctor earnings, admin commission, and revenue split.", accent: "bg-amber-50 text-amber-700", component: EarningsCommissionReport },
  { key: "records", title: "Medical Record Report", description: "Consultations, prescriptions, and medical record totals.", accent: "bg-teal-50 text-teal-700", component: MedicalRecordReport },
  { key: "audit", title: "System Activity / Audit Report", description: "Admin and user activity with system audit logs.", accent: "bg-slate-100 text-slate-700", component: AuditReport },
  { key: "support", title: "Support Report", description: "Open, pending, and resolved support tickets.", accent: "bg-orange-50 text-orange-700", component: SupportReport },
  { key: "summary", title: "Date-wise Summary Report", description: "Daily, weekly, monthly, and custom date summaries.", accent: "bg-indigo-50 text-indigo-700", component: DateSummaryReport },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState(null);
  const SelectedReport = selectedReport?.component;

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Reports & Analytics</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Reports Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Open a report to review metrics, filter records, print results, or export the current table.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report, index) => (
          <button key={report.key} type="button" onClick={() => setSelectedReport(report)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold ${report.accent}`}>{String(index + 1).padStart(2, "0")}</span>
              <span className="text-xl text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700">→</span>
            </div>
            <h2 className="mt-5 text-lg font-bold text-slate-950">{report.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{report.description}</p>
            <span className="mt-5 inline-flex text-sm font-semibold text-slate-700">Open report</span>
          </button>
        ))}
      </div>

      {SelectedReport ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={selectedReport.title} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedReport(null); }}>
          <aside className="h-full w-full max-w-6xl border-l border-slate-200 bg-slate-50 shadow-2xl">
            <SelectedReport onBack={() => setSelectedReport(null)} />
          </aside>
        </div>
      ) : null}
    </section>
  );
}
