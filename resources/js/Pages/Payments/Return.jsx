"use client";

import { Link } from "@inertiajs/react";
import { useSearchParams } from "@/utils/navigation";
import { Suspense } from "react";

/**
 * Payment return page.
 *
 * Handles the return from the SSLCOMERZ gateway after a payment attempt.
 * The gateway redirects back with a status query parameter:
 *   - status=success  Ã¢â€ â€™ payment succeeded
 *   - status=fail     Ã¢â€ â€™ payment failed
 *   - status=cancel   Ã¢â€ â€™ payment cancelled by user
 */
const STATUS_CONFIG = {
  success: {
    icon: "✅",
    title: "Payment Successful",
    message: "Your payment has been processed successfully. Your appointment is now confirmed.",
    tone: "emerald",
  },
  fail: {
    icon: "❌",
    title: "Payment Failed",
    message: "We could not process your payment. Please try again or contact support.",
    tone: "red",
  },
  cancel: {
    icon: "⚠️",
    title: "Payment Cancelled",
    message: "Your payment was cancelled. You can try again from your appointments page.",
    tone: "amber",
  },
  pending: {
    icon: "...",
    title: "Payment Under Review",
    message: "Your payment was received and is awaiting a security review. Your appointment will update after approval.",
    tone: "amber",
  },
};

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const status = (searchParams.get("status") ?? "unknown").toLowerCase();
  const tranId = searchParams.get("tran_id") ?? "";
  const appointmentId = searchParams.get("appointmentId") ?? "";

  const config = STATUS_CONFIG[status] ?? {
    icon: "Ã¢Ââ€œ",
    title: "Unknown Status",
    message: "We could not determine the status of your payment. Please check your appointments page.",
    tone: "slate",
  };

  const toneClasses = {
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      button: "bg-emerald-600 hover:bg-emerald-700",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      button: "bg-red-600 hover:bg-red-700",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      button: "bg-amber-600 hover:bg-amber-700",
    },
    slate: {
      bg: "bg-slate-50",
      border: "border-slate-200",
      text: "text-slate-700",
      button: "bg-slate-600 hover:bg-slate-700",
    },
  };

  const tones = toneClasses[config.tone] ?? toneClasses.slate;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${tones.bg}`}
        >
          <span className="text-3xl">{config.icon}</span>
        </div>

        <h1 className="mt-4 text-xl font-bold text-slate-900">{config.title}</h1>
        <p className="mt-2 text-sm text-slate-500">{config.message}</p>

        {tranId ? (
          <p className="mt-3 text-xs text-slate-400">
            Transaction ID: <span className="font-mono">{tranId}</span>
          </p>
        ) : null}

        <div className="mt-6 space-y-2">
          {appointmentId && ["fail", "cancel"].includes(status) ? (
            <Link
              href={`/payment/easy-checkout?appointmentId=${encodeURIComponent(appointmentId)}`}
              className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${tones.button}`}
            >
              Try Again
            </Link>
          ) : null}

          <Link
            href="/patient/appointments"
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Appointments
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
            <p className="mt-4 text-sm text-slate-500">Processing payment result...</p>
          </div>
        </main>
      }
    >
      <PaymentReturnContent />
    </Suspense>
  );
}
