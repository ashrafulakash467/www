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
  const amount = payment?.amount ?? appointment?.consultationFee ?? 0;
  const currency = payment?.currency ?? "BDT";
  const status = payment?.status ?? appointment?.paymentStatus ?? "Pending";
  const doctorName = appointment?.doctor?.name ?? appointment?.doctorName ?? "Ã¢â‚¬â€";
  const patientName = appointment?.patient?.name ?? appointment?.patientName ?? "Ã¢â‚¬â€";
  const appointmentDate = appointment?.appointmentDate ?? appointment?.date ?? "Ã¢â‚¬â€";
  const appointmentTime = appointment?.appointmentTime ?? appointment?.time ?? "Ã¢â‚¬â€";
  const transactionId = payment?.transactionId ?? payment?.transaction_id ?? "";
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
