"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";

export default function EarningsDetails({ earningId, onClose }) {
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDetails();
  }, [earningId]);

  async function loadDetails() {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiFetch(`/doctor/earnings/${earningId}`);
      const data = await response.json();
      if (data.success) {
        setDetails(data.data);
      } else {
        setError(data.message || "Failed to load earning details.");
      }
    } catch (err) {
      setError("An error occurred while loading details.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Earning Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />)}
          </div>
        ) : details ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Information</p>
              <div className="mt-3 space-y-2 text-sm">
                <Row label="Transaction No" value={details.payment?.transaction_no || "-"} />
                <Row label="Amount" value={`৳${formatAmount(details.payment?.amount)}`} />
                <Row label="Discount" value={`৳${formatAmount(details.payment?.discount_amount)}`} />
                <Row label="Tax" value={`৳${formatAmount(details.payment?.tax_amount)}`} />
                <Row label="Total Paid" value={`৳${formatAmount(details.payment?.paid_amount)}`} />
                <Row label="Payment Status" value={details.payment?.status || "-"} />
                <Row label="Payment Date" value={formatDate(details.payment?.paid_at)} />
              </div>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Doctor Share</p>
              <div className="mt-3 space-y-2 text-sm">
                <Row label="Percentage" value={`${details.doctor_percentage}%`} />
                <Row label="Earning" value={`৳${formatAmount(details.doctor_amount)}`} highlight />
                {details.reversal_amount > 0 && (
                  <Row label="Reversal" value={`-৳${formatAmount(details.reversal_amount)}`} className="text-red-700" />
                )}
                <Row label="Net Earning" value={`৳${formatAmount(details.net_doctor_amount)}`} highlight />
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Admin Commission</p>
              <div className="mt-3 space-y-2 text-sm">
                <Row label="Percentage" value={`${details.admin_percentage}%`} />
                <Row label="Commission" value={`৳${formatAmount(details.admin_amount)}`} />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Appointment</p>
              <div className="mt-3 space-y-2 text-sm">
                <Row label="Appointment No" value={details.appointment?.appointment_no || "-"} />
                <Row label="Date" value={details.appointment?.date || "-"} />
                <Row label="Status" value={details.appointment?.status || "-"} />
                <Row label="Earning Status" value={details.status || "-"} />
                <Row label="Earned At" value={formatDate(details.earned_at)} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value, highlight, className }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium ${highlight ? "text-emerald-700" : ""} ${className || "text-slate-800"}`}>{value}</span>
    </div>
  );
}

function formatAmount(value) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(dateString) {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}
