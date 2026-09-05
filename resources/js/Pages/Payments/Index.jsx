"use client";

import { Link } from "@inertiajs/react";
import { useRouter, useSearchParams } from "@/utils/navigation";
import { Suspense, useEffect, useState } from "react";
import PaymentSummary from "@/Components/Payments/PaymentSummary";
import { apiFetch, getStoredToken } from "@/utils/api";

export default function PaymentPage() {
  return (
    <Suspense fallback={null}>
      <PaymentContent />
    </Suspense>
  );
}

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId") ?? "";

  const [appointment, setAppointment] = useState(null);
  const [payment, setPayment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!appointmentId) {
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
  }, [appointmentId, router]);

  async function handleProceedToPayment() {
    if (!appointmentId) {
      setError("No appointment selected.");
      return;
    }

    const token = getStoredToken("patient");

    if (!token) {
      router.replace("/login");
      return;
    }

    setIsInitializing(true);
    setError("");

    try {
      const response = await apiFetch(
        "/pay",
        {
          method: "POST",
          body: JSON.stringify({ appointment_id: appointmentId }),
        },
        token,
      );
      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "Could not initialize the payment.");
        return;
      }

      if (result.gateway_url) {
        // Redirect the user to the SSLCOMMERZ gateway.
        window.location.href = result.gateway_url;
        return;
      }

      setError("Payment gateway did not return a redirect URL.");
    } catch {
      setError(
        "Could not initialize the payment. Please check your connection and try again.",
      );
    } finally {
      setIsInitializing(false);
    }
  }

  if (!appointmentId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <span className="text-3xl">ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â</span>
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Payment Unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            No appointment selected. Please choose an appointment to pay for.
          </p>
          <Link
            href="/patient/appointments"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Back to Appointments
          </Link>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading payment details...
          </p>
        </div>
      </main>
    );
  }

  if (error && !appointment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <span className="text-3xl">ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â</span>
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Payment Unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <Link
            href="/patient/appointments"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Back to Appointments
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-600">
            Secure Payment
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
            Complete Your Payment
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            You are about to pay for your appointment consultation.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <PaymentSummary appointment={appointment} payment={payment} />

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <span className="text-sm">🔒</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Secure SSLCOMMERZ Payment
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Your payment is processed securely through SSLCOMMERZ. We never
                store your card details.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleProceedToPayment}
            disabled={isInitializing || appointment?.paymentStatus === "paid"}
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isInitializing
              ? "Processing..."
              : appointment?.paymentStatus === "paid"
                ? "Already Paid"
                : "Proceed to Payment"}
          </button>

          <Link
            href="/patient/appointments"
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Appointments
          </Link>
        </div>
      </div>
    </main>
  );
}
