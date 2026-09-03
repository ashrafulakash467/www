"use client";

import { useMemo, useState } from "react";

const workflowSteps = [
  "Select Chamber / Consultation Type",
  "Define Working Days",
  "Define Start and End Time",
  "Set Slot Duration",
  "Set Breaks and Capacity",
  "Add Exceptions",
  "Preview Availability",
  "Save Schedule",
  "Generate Appointment Slots",
];

const dayOptions = [
  { key: "sun", label: "Sun" },
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
];

const defaultWorkingDays = ["mon", "tue", "wed", "thu", "sat"];

export default function ScheduleManagementPage({ doctor, onNavigateSection }) {
  const [schedule, setSchedule] = useState({
    chamber: "Main Chamber",
    consultationType: "In-person",
    workingDays: defaultWorkingDays,
    startTime: "09:00",
    endTime: "17:00",
    slotDuration: "20",
    breakStart: "13:00",
    breakEnd: "13:30",
    capacity: "24",
    exceptions: "Friday half-day closure on 2026-08-07",
  });
  const [savedMessage, setSavedMessage] = useState("");
  const [generatedSlots, setGeneratedSlots] = useState([]);

  const preview = useMemo(() => {
    const slotDuration = Number(schedule.slotDuration || 0);
    const workingMinutes = minutesBetween(schedule.startTime, schedule.endTime);
    const breakMinutes =
      minutesBetween(schedule.breakStart, schedule.breakEnd) > 0
        ? minutesBetween(schedule.breakStart, schedule.breakEnd)
        : 0;
    const usableMinutes = Math.max(workingMinutes - breakMinutes, 0);
    const slotsPerDay = slotDuration > 0 ? Math.floor(usableMinutes / slotDuration) : 0;
    const weeklySlots = slotsPerDay * schedule.workingDays.length;

    return {
      workingMinutes,
      breakMinutes,
      slotsPerDay,
      weeklySlots,
      workingHoursLabel: formatDurationMinutes(workingMinutes),
    };
  }, [schedule]);

  function updateField(name, value) {
    setSchedule((current) => ({
      ...current,
      [name]: value,
    }));
    setSavedMessage("");
  }

  function toggleWorkingDay(dayKey) {
    setSchedule((current) => {
      const exists = current.workingDays.includes(dayKey);
      const nextWorkingDays = exists
        ? current.workingDays.filter((day) => day !== dayKey)
        : [...current.workingDays, dayKey];

      return {
        ...current,
        workingDays: nextWorkingDays,
      };
    });
    setSavedMessage("");
  }

  function handleSaveSchedule() {
    setSavedMessage("Schedule saved successfully. You can generate slots now.");
  }

  function handleGenerateSlots() {
    const slotDuration = Number(schedule.slotDuration || 0);
    const generated = [];

    schedule.workingDays.forEach((dayKey) => {
      const dayLabel = dayOptions.find((day) => day.key === dayKey)?.label ?? dayKey;
      const daySlots = buildSlotsForDay(
        schedule.startTime,
        schedule.endTime,
        slotDuration,
        schedule.breakStart,
        schedule.breakEnd,
      );

      daySlots.forEach((slot) => {
        generated.push({
          day: dayLabel,
          slot,
        });
      });
    });

    setGeneratedSlots(generated);
    setSavedMessage(`Generated ${generated.length} appointment slots.`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Schedule Management
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Build the doctor schedule from chamber setup to slot generation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigateSection("dashboard")}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to dashboard
          </button>
          <button
            type="button"
            onClick={handleGenerateSlots}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Generate Appointment Slots
          </button>
        </div>
      </div>

      {savedMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {savedMessage}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Workflow Steps
              </h2>
              <p className="text-sm text-slate-500">
                Follow the same sequence every time you update availability.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {workflowSteps.map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-lg border border-slate-100 bg-slate-50/60 p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{step}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {workflowDescription(step)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Doctor
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              Dr. {doctor?.name || "Unavailable"}
            </p>
            <p className="text-sm text-slate-500">{doctor?.specialty || "Doctor"}</p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Schedule Builder
              </h2>
              <p className="text-sm text-slate-500">
                Configure the chamber, working days, timings, breaks, and capacity.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Select Chamber
              </span>
              <select
                value={schedule.chamber}
                onChange={(event) => updateField("chamber", event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                <option>Main Chamber</option>
                <option>Branch Chamber</option>
                <option>Telemedicine</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Consultation Type
              </span>
              <select
                value={schedule.consultationType}
                onChange={(event) =>
                  updateField("consultationType", event.target.value)
                }
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                <option>In-person</option>
                <option>Follow-up</option>
                <option>Emergency</option>
                <option>Video Consultation</option>
              </select>
            </label>

            <div className="sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Define Working Days
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {dayOptions.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleWorkingDay(day.key)}
                    className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                      schedule.workingDays.includes(day.key)
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Start Time
              </span>
              <input
                type="time"
                value={schedule.startTime}
                onChange={(event) => updateField("startTime", event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                End Time
              </span>
              <input
                type="time"
                value={schedule.endTime}
                onChange={(event) => updateField("endTime", event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Slot Duration
              </span>
              <select
                value={schedule.slotDuration}
                onChange={(event) =>
                  updateField("slotDuration", event.target.value)
                }
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="20">20 minutes</option>
                <option value="30">30 minutes</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Capacity
              </span>
              <input
                type="number"
                min="1"
                value={schedule.capacity}
                onChange={(event) => updateField("capacity", event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Break Start
              </span>
              <input
                type="time"
                value={schedule.breakStart}
                onChange={(event) =>
                  updateField("breakStart", event.target.value)
                }
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Break End
              </span>
              <input
                type="time"
                value={schedule.breakEnd}
                onChange={(event) => updateField("breakEnd", event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Add Exceptions
              </span>
              <textarea
                rows={4}
                value={schedule.exceptions}
                onChange={(event) => updateField("exceptions", event.target.value)}
                placeholder="Leave, holiday, emergency closure, or any date-specific exceptions"
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={handleSaveSchedule}
              className="rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Save Schedule
            </button>
            <button
              type="button"
              onClick={handleGenerateSlots}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Generate Appointment Slots
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection("dashboard")}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Preview on Dashboard
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <PreviewCard
              label="Chamber"
              value={schedule.chamber}
              detail={schedule.consultationType}
            />
            <PreviewCard
              label="Working Window"
              value={preview.workingHoursLabel}
              detail={`${schedule.startTime} - ${schedule.endTime}`}
            />
            <PreviewCard
              label="Working Days"
              value={schedule.workingDays.length}
              detail={schedule.workingDays
                .map((dayKey) => dayOptions.find((day) => day.key === dayKey)?.label)
                .filter(Boolean)
                .join(", ")}
            />
            <PreviewCard
              label="Slots Per Day"
              value={preview.slotsPerDay}
              detail={`${schedule.startTime} - ${schedule.endTime}`}
            />
            <PreviewCard
              label="Break"
              value={`${schedule.breakStart} - ${schedule.breakEnd}`}
              detail={`${preview.breakMinutes} min break`}
            />
            <PreviewCard
              label="Capacity"
              value={schedule.capacity}
              detail="Max appointments per schedule"
            />
            <PreviewCard
              label="Weekly Slots"
              value={preview.weeklySlots}
              detail="Generated from current setup"
            />
          </div>

          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Generated Slots
            </p>
            {generatedSlots.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No slots generated yet. Save the schedule and generate slots to
                preview availability.
              </p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {generatedSlots.slice(0, 12).map((item, index) => (
                  <div
                    key={`${item.day}-${item.slot}-${index}`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <span className="font-semibold text-slate-900">
                      {item.day}
                    </span>{" "}
                    {item.slot}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PreviewCard({ label, value, detail }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail || " "}</p>
    </div>
  );
}

function workflowDescription(step) {
  switch (step) {
    case "Select Chamber / Consultation Type":
      return "Choose the room or channel and the kind of appointment you are planning.";
    case "Define Working Days":
      return "Pick the weekdays the schedule should stay open.";
    case "Define Start and End Time":
      return "Set the start and end times for the session window.";
    case "Set Slot Duration":
      return "Decide how long each appointment slot should run.";
    case "Set Breaks and Capacity":
      return "Block out rest time and control how many patients can be booked.";
    case "Add Exceptions":
      return "Add leave, holiday, or emergency closure dates.";
    case "Preview Availability":
      return "Review the total slots before saving the schedule.";
    case "Save Schedule":
      return "Store the schedule configuration for future use.";
    case "Generate Appointment Slots":
      return "Create bookable slots from the saved schedule.";
    default:
      return "";
  }
}

function minutesBetween(start, end) {
  if (!start || !end) {
    return 0;
  }

  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

function buildSlotsForDay(startTime, endTime, durationMinutes, breakStart, breakEnd) {
  const slots = [];
  if (!durationMinutes || durationMinutes <= 0) {
    return slots;
  }

  let currentMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const breakStartMinutes = timeToMinutes(breakStart);
  const breakEndMinutes = timeToMinutes(breakEnd);

  while (currentMinutes + durationMinutes <= endMinutes) {
    const nextMinutes = currentMinutes + durationMinutes;
    const overlapsBreak =
      currentMinutes < breakEndMinutes && nextMinutes > breakStartMinutes;

    if (!overlapsBreak) {
      slots.push(`${minutesToTime(currentMinutes)} - ${minutesToTime(nextMinutes)}`);
    }

    currentMinutes += durationMinutes;
  }

  return slots;
}

function timeToMinutes(time) {
  if (!time) {
    return 0;
  }

  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDurationMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}
