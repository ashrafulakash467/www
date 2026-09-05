"use client";

import { Link } from "@inertiajs/react";
import { useRouter } from "@/utils/navigation";
import { useSearchParams } from "@/utils/navigation";
import { Suspense, useEffect, useState } from "react";
import { apiFetch, getStoredToken } from "@/utils/api";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

export default function RescheduleAppointmentPage() {
  return (
    <Suspense fallback={null}>
      <RescheduleAppointmentContent />
    </Suspense>
  );
}

function RescheduleAppointmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [appointmentId] = useState(() => searchParams.get("appointmentId") ?? "");
  const [appointment, setAppointment] = useState(null);
  const [dates, setDates] = useState([]);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotTime, setSlotTime] = useState("");
  const [error, setError] = useState("");
  const [rescheduleToast, setRescheduleToast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!appointmentId) {
      return;
    }

    async function loadOptions() {
      const token = getStoredToken("patient");
      if (!token) {
        router.replace("/login");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await apiFetch(
          `/appointment/reschedule-options?appointmentId=${appointmentId}`,
          {},
          token,
        );
        const result = await response.json();

        if (!response.ok) {
          setError(result.message ?? "Could not load reschedule options.");
          return;
        }

        setAppointment(result.appointment);
        setDates(result.dates ?? []);
      } catch {
        setError("Could not load reschedule options. Please check your connection and try again.");
      } finally {
        setIsLoading(false);
      }
    }

    loadOptions();
  }, [appointmentId, router]);

  useEffect(() => {
    if (!appointmentId || !appointmentDate) {
      return;
    }

    async function loadSlots() {
      const token = getStoredToken("patient");
      setError("");
      setSlots([]);
      setSlotTime("");
      setIsSlotsLoading(true);

      try {
        const response = await apiFetch(
          `/appointment/reschedule-slots?appointmentId=${appointmentId}&date=${appointmentDate}`,
          {},
          token,
        );
        const result = await response.json();

        if (!response.ok) {
          setError(result.message ?? "Could not load time slots.");
          return;
        }

        setSlots(result.slots ?? []);
      } catch {
        setError("Could not load slots. Please check your connection and try again.");
      } finally {
        setIsSlotsLoading(false);
      }
    }

    loadSlots();
  }, [appointmentId, appointmentDate]);

  useEffect(() => {
    if (!rescheduleToast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setRescheduleToast(null);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [rescheduleToast]);

  const activeAppointmentDate = dates.includes(appointmentDate)
    ? appointmentDate
    : "";
  const availableSlots = slots.filter((slot) => !slot.isBooked);
  const activeSlotTime = availableSlots.some((slot) => slot.time === slotTime)
    ? slotTime
    : "";
  const hasRescheduled =
    Boolean(appointment?.rescheduledAt) ||
    appointment?.status === "reschedule_requested" ||
    appointment?.changeRequest?.type === "reschedule";

  async function handleSubmit(event) {
    event.preventDefault();
    if (hasRescheduled) {
      return;
    }

    const token = getStoredToken("patient");
    if (!token) {
      router.replace("/login");
      return;
    }

    setError("");
    setRescheduleToast(null);
    setIsSubmitting(true);

    try {
      const response = await apiFetch(
        "/appointment/reschedule",
        {
          method: "POST",
          body: JSON.stringify({
            appointmentId,
            appointmentDate: activeAppointmentDate,
            slotTime: activeSlotTime,
          }),
        },
        token,
      );
      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "Could not reschedule appointment.");
        return;
      }

      setAppointment(result.appointment);
      setRescheduleToast({
        message: result.message ?? "Appointment rescheduled successfully.",
        isRequestSubmitted: Boolean(result.requestSubmitted),
        appointmentDate:
          result.requestedAppointmentDate ?? result.appointment?.appointmentDate ?? appointmentDate,
        slotTime: result.requestedSlotTime ?? result.appointment?.slotTime ?? activeSlotTime,
        doctorName: result.appointment?.doctor?.name ?? "Doctor",
      });
      setSlotTime("");
    } catch {
      setError("Could not reschedule appointment. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="bg-white">
      {rescheduleToast ? (
        <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,420px)] rounded-2xl border border-green-200 bg-white px-4 py-4 shadow-[0_18px_50px_rgba(16,185,129,0.18)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-green-700">
                {rescheduleToast.message}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {rescheduleToast.isRequestSubmitted
                  ? `Requested: ${rescheduleToast.appointmentDate} at ${rescheduleToast.slotTime}.`
                  : `${rescheduleToast.doctorName} on ${rescheduleToast.appointmentDate} at ${rescheduleToast.slotTime}.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRescheduleToast(null)}
              className="rounded-full px-2 py-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Dismiss notification"
            >
             Testing
            </button>
          </div>
        </div>
      ) : null}
      <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
          Reschedule Appointment
        </p>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-950">
          Choose a new time
        </h1>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-lg border border-brand-soft bg-[#f7fbf8] p-5 shadow-[0_18px_50px_rgba(52,92,50,0.10)]"
        >
          {error ? (
            <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {isLoading ? (
            <p className="rounded-md border border-blue-100 bg-blue-50 px-4 py-5 text-sm text-blue-700">
              Loading appointment...
            </p>
          ) : null}

          {appointment ? (
            <div className="rounded-md border border-blue-100 bg-white p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-950">
                {appointment.doctor.name}
              </p>
              <p className="mt-1">
                {appointment.doctor.specialty}
              </p>
              <p className="mt-1">
                Current: {appointment.appointmentDate} at {appointment.slotTime}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                {appointment.status}
              </p>
            </div>
          ) : null}

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">Available dates</p>
              {activeAppointmentDate ? (
                <span className="text-xs font-medium text-brand">
                  Selected: {activeAppointmentDate}
                </span>
              ) : null}
            </div>
            {dates.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No future dates available.
              </p>
            ) : (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-white shadow-sm">
                <DayPicker
                  mode="single"
                  selected={
                    activeAppointmentDate
                      ? parseDateKeyToDate(activeAppointmentDate)
                      : undefined
                  }
                  onSelect={(date) => {
                    setAppointmentDate(date ? getLocalDateKey(date) : "");
                    setSlotTime("");
                    setSlots([]);
                  }}
                  disabled={(date) => !dates.includes(getLocalDateKey(date))}
                  defaultMonth={parseDateKeyToDate(dates[0])}
                  className="mx-auto"
                />
              </div>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Select a future available date to see its time slots.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">
                Available time slots
              </p>
              {activeSlotTime ? (
                <span className="text-xs font-medium text-brand">
                  Selected: {activeSlotTime}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {!activeAppointmentDate ? (
                <p className="text-sm text-slate-500">
                  Choose a future date to see available time slots.
                </p>
              ) : isSlotsLoading ? (
                <p className="text-sm text-slate-500">
                  Loading available time slots...
                </p>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No available time slots for this date.
                </p>
              ) : (
                availableSlots.map((slot) => {
                  const isSlotSelected = activeSlotTime === slot.time;

                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setSlotTime(slot.time)}
                      aria-pressed={isSlotSelected}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        isSlotSelected
                          ? "border-emerald-600 bg-emerald-600 text-white ring-2 ring-emerald-600 shadow-sm"
                          : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-green-300 hover:bg-green-100 hover:text-green-700"
                      }`}
                    >
                      {slot.time}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {hasRescheduled ? (
              <p className="flex min-h-12 flex-1 items-center rounded-md border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700">
                {appointment?.status === "reschedule_requested"
                  ? "Your reschedule request has already been submitted."
                  : "This appointment has already been rescheduled."}
              </p>
            ) : (
              <button
                type="submit"
                disabled={!activeAppointmentDate || !activeSlotTime || isSubmitting}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Rescheduling..." : "Confirm reschedule"}
              </button>
            )}
            <Link
              href="/patient/dashboard"
              className="inline-flex h-12 items-center justify-center rounded-md border border-brand px-5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-brand-foreground"
            >
              Back to dashboard
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

function getLocalDateKey(input = new Date()) {
  const date = input instanceof Date ? input : new Date(input);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKeyToDate(dateKey) {
  if (typeof dateKey !== "string") {
    return undefined;
  }

  const parts = dateKey.split("-").map(Number);

  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return undefined;
  }

  return new Date(parts[0], parts[1] - 1, parts[2]);
}
