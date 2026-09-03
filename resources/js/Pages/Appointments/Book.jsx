"use client";

import { Link } from "@inertiajs/react";
import { useSearchParams } from "@/utils/navigation";
import { Suspense, useEffect, useState } from "react";
import DoctorCardDetails from "@/Components/shared/DoctorCardDetails";
import { apiFetch, getStoredToken } from "@/utils/api";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

export default function BookAppointmentPage() {
  return (
    <Suspense fallback={null}>
      <BookAppointmentContent />
    </Suspense>
  );
}

function BookAppointmentContent() {
  const searchParams = useSearchParams();
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState(() => searchParams.get("doctorId") ?? "");
  const [bookingOptions, setBookingOptions] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotRefreshTick, setSlotRefreshTick] = useState(0);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [bookedOutDates, setBookedOutDates] = useState(() => new Set());
  const [slotTime, setSlotTime] = useState("");
  const [error, setError] = useState("");
  const [bookingToast, setBookingToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // NOTE: initialize SSR-safe deterministic values (false / 0) so the server
  // and the first client render produce identical HTML, then sync real values
  // inside effects below (which only run after hydration on the client).
  // This avoids hydration mismatches caused by Date.now() / localStorage reads
  // inside useState initializers.
  const [now, setNow] = useState(0);
  const [isPatientLoggedIn, setIsPatientLoggedIn] = useState(false);

  useEffect(() => {
    const syncAuth = () => {
      setIsPatientLoggedIn(
        Boolean(
          getStoredToken("admin") || getStoredToken("doctor") || getStoredToken("patient"),
        ),
      );
    };

    syncAuth();
    window.addEventListener("auth-change", syncAuth);
    window.addEventListener("storage", syncAuth);

    return () => {
      window.removeEventListener("auth-change", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  useEffect(() => {
    async function loadDoctors() {
      try {
        const response = await apiFetch("/doctor/search?limit=50&sort=name_asc");
        const result = await response.json();
        if (response.ok) {
          setDoctors(result.data ?? []);
        }
      } catch {
        setError("Could not load doctors. Please check your connection and try again.");
      }
    }

    loadDoctors();
  }, []);

  useEffect(() => {
    const syncNow = () => {
      setNow(Date.now());
    };

    syncNow();

    const intervalId = window.setInterval(syncNow, 60_000);
    window.addEventListener("focus", syncNow);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncNow();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncNow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!doctorId) {
      return;
    }

    async function loadOptions() {
      setError("");
      setBookingOptions(null);
      setAppointmentDate("");
      setSlots([]);
      setSlotTime("");
      setBookedOutDates(new Set());

      try {
        const response = await apiFetch(
          `/appointment/booking-options?doctorId=${doctorId}`,
          {},
          getStoredToken("admin") || getStoredToken("doctor") || getStoredToken("patient"),
        );
        const result = await response.json();

        if (!response.ok) {
          setError(result.message ?? "Could not load booking options.");
          return;
        }

        setBookingOptions(result);

      } catch {
        setError("Could not load booking options. Please check your connection and try again.");
      }
    }

    loadOptions();
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId || !appointmentDate) {
      return;
    }

    async function loadSlots() {
      setError("");
      setIsSlotsLoading(true);

      try {
        const response = await apiFetch(
          `/appointment/available-slots?doctorId=${doctorId}&date=${appointmentDate}`,
          {},
          getStoredToken("admin") || getStoredToken("doctor") || getStoredToken("patient"),
        );
        const result = await response.json();

        if (!response.ok) {
          setError(result.message ?? "Could not load time slots.");
          return;
        }

        setSlots(result.slots ?? []);

        const upcomingSlotsForDate = (result.slots ?? []).filter(
          (slot) =>
            !slot.isBooked &&
            !isPastAppointmentSlot(appointmentDate, slot.time, now),
        );
        setBookedOutDates((current) => {
          const next = new Set(current);
          if (upcomingSlotsForDate.length === 0) {
            next.add(appointmentDate);
          } else {
            next.delete(appointmentDate);
          }
          return next;
        });
      } catch {
        setError("Could not load slots. Please check your connection and try again.");
      } finally {
        setIsSlotsLoading(false);
      }
    }

    loadSlots();
  }, [doctorId, appointmentDate, slotRefreshTick]);

  useEffect(() => {
    if (!doctorId || !appointmentDate) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setSlotRefreshTick((current) => current + 1);
    }, 15000);

    const handleFocus = () => {
      setSlotRefreshTick((current) => current + 1);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setSlotRefreshTick((current) => current + 1);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [doctorId, appointmentDate]);

  useEffect(() => {
    if (!bookingToast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setBookingToast(null);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [bookingToast]);

  const selectedDoctor =
    bookingOptions?.doctor ??
    doctors.find((doctor) => String(doctor.id) === String(doctorId)) ??
    null;
  const selectedDoctorAvailableDates =
    selectedDoctor?.availableDates ?? selectedDoctor?.available_dates ?? [];
  const availableTimeSlots = formatDoctorList(
    selectedDoctor?.availableTimeSlots ?? selectedDoctor?.available_time_slots,
  );
  const todayDateKey = getLocalDateKey(new Date(now));
  const visibleAvailableDates = selectedDoctorAvailableDates.filter((date) =>
    isDateOnOrAfterToday(date, todayDateKey),
  );
  const selectableDates = visibleAvailableDates.filter(
    (date) => !bookedOutDates.has(date),
  );
  const activeAppointmentDate = selectableDates.includes(appointmentDate)
    ? appointmentDate
    : "";
const visibleSlots = activeAppointmentDate
  ? (slots.length > 0
      ? slots.filter(
          (slot) =>
            !slot.isBooked &&
            !isPastAppointmentSlot(
              activeAppointmentDate,
              slot.time,
              now
            )
        )
      : availableTimeSlots
          .split(",")
          .map((time) => time.trim())
          .filter(Boolean)
          .map((time) => ({
            time: time.split(" - ")[0].trim(),
            isBooked: false,
          }))
          .filter(
            (slot) =>
              !isPastAppointmentSlot(
                activeAppointmentDate,
                slot.time,
                now
              )
          ))
  : [];

  const slotDurationMinutes =
    Number(bookingOptions?.schedule?.slotDurationMinutes) || 15;
  const activeSlotTime = visibleSlots.some((slot) => slot.time === slotTime)
    ? slotTime
    : "";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBookingToast(null);

    const token =
      getStoredToken("patient") ||
      getStoredToken("admin") ||
      getStoredToken("doctor");

    if (!token) {
      setError("Please log in before booking an appointment.");
      return;
    }

    if (!doctorId || !activeAppointmentDate || !activeSlotTime) {
      setError(
        "Please select a doctor, appointment date, and time slot before booking.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiFetch(
        "/appointment/book",
        {
          method: "POST",
          body: JSON.stringify({
            doctorId: Number(doctorId),
            appointmentDate: activeAppointmentDate,
            slotTime: activeSlotTime,
          }),
        },
        token,
      );
      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "Could not book appointment.");
        return;
      }

      setBookingToast({
        doctorName: result.appointment?.doctor?.name ?? "Doctor",
        appointmentDate: result.appointment?.appointmentDate ?? activeAppointmentDate,
        slotTime: result.appointment?.slotTime ?? activeSlotTime,
        id: result.appointment?.id ?? "",
        status: result.appointment?.status ?? "pending",
      });
      setSlotTime("");
      setSlots((currentSlots) =>
        currentSlots.filter(
          (slot) => slot.time !== (result.appointment?.slotTime ?? activeSlotTime),
        ),
      );
      setSlotRefreshTick((current) => current + 1);
    } catch {
      setError(
        "Could not book appointment. Please check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="bg-white">
      {bookingToast ? (
        <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,420px)] rounded-2xl border border-green-200 bg-white px-4 py-4 shadow-[0_18px_50px_rgba(16,185,129,0.18)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-green-700">Booking confirmed</p>
              <p className="mt-1 text-sm text-slate-700">
                {bookingToast.doctorName} on{" "}
                {bookingToast.appointmentDate} at {bookingToast.slotTime}.
              </p>
              <p className="mt-1 text-xs text-slate-500">Appointment ID: {bookingToast.id}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-green-600">
                Status: {bookingToast.status}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBookingToast(null)}
              className="rounded-full px-2 py-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Dismiss notification"
            >
              ÃƒÆ’Ã¢â‚¬â€
            </button>
          </div>
        </div>
      ) : null}
      <section className="mx-auto min-h-[calc(100vh-220px)] w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
          Appointment Booking
        </p>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-950">
          Book an appointment
        </h1>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-lg border border-brand-soft bg-[#f7fbf8] p-5 shadow-[0_18px_50px_rgba(52,92,50,0.10)]"
        >
          {!isPatientLoggedIn ? (
            <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">Login required to confirm booking</p>
              <p className="mt-1">
                You can review doctor details, dates, and slots, but booking will only work after login.
              </p>
              <Link href="/login" className="mt-2 inline-flex font-semibold text-brand">
                Go to login
              </Link>
            </div>
          ) : null}

          {error ? (
            <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{error}</p>
              {error.includes("log in") ? (
                <Link href="/login" className="mt-2 inline-flex font-semibold text-brand">
                  Go to login
                </Link>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Doctor</span>
              <select
                value={doctorId}
                onChange={(event) => setDoctorId(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand"
              >
                <option value="">Select doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialty}
                  </option>
                ))}
              </select>
            </label>

          </div>

               
                  {selectedDoctor ? (
                    <div className="mt-6">
                      <DoctorCardDetails doctor={selectedDoctor} />
                    </div>
                  ) : (
                    <p className="mt-6 text-sm text-slate-500">
                      Select a doctor to see their details.
                    </p>
                  )}
                


          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">Available dates</p>
              {activeAppointmentDate ? (
                <span className="text-xs font-medium text-brand">
                  Selected: {activeAppointmentDate}
                </span>
              ) : null}
            </div>
            {!selectedDoctor ? (
              <p className="mt-3 text-sm text-slate-500">
                Select a doctor to see available dates.
              </p>
            ) : selectableDates.length === 0 ? (
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
                  disabled={(date) =>
                    !selectableDates.includes(getLocalDateKey(date))
                  }
                  defaultMonth={now ? new Date(now) : undefined}
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
              <p className="text-sm font-semibold text-slate-700">Available time slots</p>
              {activeSlotTime ? (
                <span className="text-xs font-medium text-brand">
                  Selected: {activeSlotTime}
                </span>
              ) : null}
            </div>
            {selectedDoctor ? (
              <div className="mt-3">
                <InfoRow label="Available Time " value={availableTimeSlots || "Not available"} />
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {!activeAppointmentDate ? (
                <p className="text-sm text-slate-500">
                  Choose a future date to see available time slots.
                </p>
              ) : isSlotsLoading ? (
                <p className="text-sm text-slate-500">
                  Loading available time slots...
                </p>
              ) : visibleSlots.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No available time slots for this date.
                </p>
              ) : (
                visibleSlots.map((slot) => {
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
                      {formatSlotRange(slot.time, slotDurationMinutes)}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={
              !isPatientLoggedIn ||
              !doctorId ||
              !activeAppointmentDate ||
              !activeSlotTime ||
              isSubmitting
            }
            className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!isPatientLoggedIn
              ? "Log in to book"
              : isSubmitting
                ? "Booking..."
                : "Confirm appointment"}
          </button>
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

function isDateOnOrAfterToday(dateString, todayDateKey) {
  if (typeof dateString !== "string" || !todayDateKey) {
    return false;
  }

  return dateString >= todayDateKey;
}

function isPastAppointmentSlot(appointmentDate, slotTime, now) {
  const appointmentDateTime = parseAppointmentDateTimeLocal(appointmentDate, slotTime);

  if (!appointmentDateTime) {
    return false;
  }

  return appointmentDateTime.getTime() < now;
}

function parseAppointmentDateTimeLocal(appointmentDate, slotTime) {
  if (typeof appointmentDate !== "string" || typeof slotTime !== "string") {
    return null;
  }

  const dateMatch = appointmentDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) {
    return null;
  }

  const timeText = slotTime.split("-")[0].trim();
  const timeMatch = timeText.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?$/);
  if (!timeMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2] ?? "0");
  const meridiem = timeMatch[3]?.toLowerCase() ?? "";

  if (meridiem === "am") {
    if (hours === 12) {
      hours = 0;
    }
  } else if (meridiem === "pm" && hours !== 12) {
    hours += 12;
  }

  return new Date(year, month, day, hours, minutes, 0, 0);
}

function parseTimeText(dateText) {
  if (typeof dateText !== "string") {
    return null;
  }

  const match = dateText
    .trim()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?$/);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const meridiem = (match[3] ?? "").toLowerCase();

  if (meridiem === "am") {
    if (hours === 12) {
      hours = 0;
    }
  } else if (meridiem === "pm" && hours !== 12) {
    hours += 12;
  }

  const parsed = new Date(2000, 0, 1, hours, minutes, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTimeText(date) {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  hours %= 12;
  if (hours === 0) {
    hours = 12;
  }
  return `${hours}:${minutes} ${suffix}`;
}

function formatSlotRange(startTime, durationMinutes) {
  const duration = Number(durationMinutes);
  if (typeof startTime !== "string" || !Number.isFinite(duration) || duration <= 0) {
    return startTime ?? "";
  }

  const start = parseTimeText(startTime);

  if (!start) {
    return startTime;
  }

  const end = new Date(start.getTime() + duration * 60_000);
  return `${startTime} - ${formatTimeText(end)}`;
}

function formatDoctorList(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
      {/* <p className="text-right text-sm font-semibold text-slate-700">{value}</p> */}
      <p className="min-w-0 pr-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
    </div>
  );
}
