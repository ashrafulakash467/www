"use client";

import { useRouter, useSearchParams } from "@/utils/navigation";
import { useEffect, useState } from "react";
import { apiFetch, getStoredToken } from "@/utils/api";

/**
 * PaymentSummary component.
 *
 * Fetches payment details directly from the API using the appointmentId
 * from the URL search params (or passed as a prop).
 *
 * API Endpoint: GET /appointments/:appointmentId/payment-details
 * Returns: { appointment, payment }
 *
 * Usage:
 *   <PaymentSummary appointmentId="123" />           // Fetches from API
 *   <PaymentSummary appointment={apt} payment={pay} /> // Uses provided data
 */
export default function PaymentSummary({
  appointmentId: appointmentIdProp,
  appointment: appointmentProp,
  payment: paymentProp,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = appointmentIdProp ?? searchParams.get("appointmentId") ?? "";

  const [appointment, setAppointment] = useState(appointmentProp ?? null);
  const [payment, setPayment] = useState(paymentProp ?? null);
  const [isLoading, setIsLoading] = useState(!appointmentProp && !paymentProp);
  const [error, setError] = useState("");

  useEffect(() => {
    // If appointment and payment props are provided, skip API fetch
    if (appointmentProp && paymentProp) {
      setAppointment(appointmentProp);
      setPayment(paymentProp);
      setIsLoading(false);
      return;
    }

    if (!appointmentId) {
      setIsLoading(false);
      setError("No appointment ID provided.");
      return;
    }

    const token = getStoredToken("patient");

    if (!token) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    async function loadPaymentDetails() {
      setIsLoading(true);
      setError("");

      try {
        const response = await apiFetch(
          `/appointments/${encodeURIComponent(appointmentId)}/payment-details`,
          {},
          token,
        );
        const result = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setError(result.message ?? "Could not load payment details.");
          return;
        }

        setAppointment(result.appointment ?? null);
        setPayment(result.payment ?? null);
      } catch {
        if (!cancelled) {
          setError(
            "Could not load payment details. Please check your connection and try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPaymentDetails();

    return () => {
      cancelled = true;
    };
  }, [appointmentId, router, appointmentProp, paymentProp]);

  // Derive display values from API data
  const amount = payment?.amount || payment?.total_amount || payment?.paid_amount || appointment?.consultationFee || appointment?.doctor?.consultation_fee || 0;
  const currency = payment?.currency ?? "BDT";
  const status = payment?.status ?? appointment?.paymentStatus ?? "Pending";
  const doctorName = firstNonEmpty(
    resolvePersonName(appointment?.doctor),
    appointment?.doctorName,
    appointment?.doctor_name,
    appointment?.doctorName,
  ) ?? "Not available";
  const patientName = appointment?.patient?.name
    ?? appointment?.patient?.user?.name
    ?? appointment?.patientName
    ?? "Not available";
  const appointmentDate = formatAppointmentDate(appointment?.appointmentDate
    ?? appointment?.appointment_date
    ?? appointment?.date);
  const appointmentTime = formatAppointmentTime(appointment?.appointmentTime
    ?? appointment?.slotTime
    ?? appointment?.start_time
    ?? appointment?.time);
  const transactionId = payment?.transactionId
    ?? payment?.transaction_id
    ?? payment?.gateway_transaction_id
    ?? payment?.transaction_no
    ?? "";
  const paymentMethod = payment?.method ?? payment?.paymentMethod ?? "";

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Payment Summary</h2>
        <div className="mt-6 flex flex-col items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-sm text-slate-500">Loading payment details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Payment Summary</h2>
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  // Main summary display
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Payment Summary</h2>
      <p className="mt-1 text-sm text-slate-500">
        Review your appointment details before proceeding to payment.
      </p>

      <div className="mt-5 space-y-3">
        <SummaryRow label="Doctor" value={doctorName} />
        <SummaryRow label="Patient" value={patientName} />
        <SummaryRow label="Date" value={appointmentDate} />
        <SummaryRow label="Time" value={appointmentTime} />
        <SummaryRow label="Status" value={status} />
        {paymentMethod ? <SummaryRow label="Payment Method" value={paymentMethod} /> : null}
        {transactionId ? <SummaryRow label="Transaction ID" value={transactionId} /> : null}
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
        <span className="text-sm font-semibold text-emerald-700">Total Amount</span>
        <span className="text-lg font-bold text-emerald-700">
          {currency} {Number(amount).toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function resolvePersonName(person) {
  if (!person) return null;
  if (typeof person === "string") return person.trim() || null;
  return firstNonEmpty(
    person.name,
    person.full_name,
    person.fullName,
    person.user?.name,
    person.user?.full_name,
    person.user?.fullName,
    person.user?.username,
  );
}

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === "string" && value.trim() !== "")?.trim() ?? null;
}

function formatAppointmentDate(value) {
  if (!value) return "Not available";
  const raw = String(value);
  const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnly) return dateOnly[1];
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
}

function formatAppointmentTime(value) {
  if (!value) return "Not available";
  const raw = String(value).trim();
  const timeMatch = raw.match(/(?:T|\s)(\d{1,2}):(\d{2})(?::\d{2})?/);
  const parts = timeMatch ? timeMatch.slice(1) : raw.match(/^(\d{1,2}):(\d{2})/);
  if (!parts) return raw;
  const hours = Number(parts[0]);
  const minutes = parts[1];
  if (!Number.isFinite(hours)) return raw;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${suffix}`;
}
