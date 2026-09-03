"use client";

import { useEffect, useRef, useState } from "react";
import { resolveDoctorImageSrc } from "@/Components/shared/DoctorCard";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

const verificationStatusOptions = [
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
  { value: "unavailable", label: "Unavailable" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "offline", label: "Offline" },
  { value: "unavailable", label: "Unavailable" },
];

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const DOCTOR_IMAGE_FALLBACK = "/images/doc1.png";

export default function UpdateDoctorPage({ doctor, form, setForm, onSave, onCancel }) {
  const fileInputRef = useRef(null);
  const initialImagePreviewSrc = resolveDoctorImageSrc(doctor);
  const imagePreviewRef = useRef(initialImagePreviewSrc);
  const [showImageControls, setShowImageControls] = useState(true);
  const [imagePreviewSrc, setImagePreviewSrc] = useState(initialImagePreviewSrc);

  const currentValue = (key, fallback = "") => {
    const value = form?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
    return fallback;
  };

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const [selectedDates, setSelectedDates] = useState(() =>
    normalizeAvailableDates(availabilityDateSource(form, doctor)),
  );
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:30");
  const [slotDuration, setSlotDuration] = useState("20");
  const [generatedTimeSlots, setGeneratedTimeSlots] = useState(() =>
    buildInitialSlotList(
      normalizeAvailableDates(availabilityDateSource(form, doctor)),
      normalizeSlotList(availabilitySlotSource(form, doctor)),
    ),
  );

  const commitSelectedDates = (nextDates) => {
    setSelectedDates(nextDates);
    updateField("availableDates", nextDates.join("\n"));
  };

  const handleDateSelect = (dates) => {
    commitSelectedDates([...new Set((dates ?? []).map(formatDateKey))]);
  };

  const removeDate = (dateKey) => {
    commitSelectedDates(selectedDates.filter((item) => item !== dateKey));
  };

  const clearAllDates = () => {
    commitSelectedDates([]);
  };

  const commitGeneratedSlots = (nextGroups) => {
    setGeneratedTimeSlots(nextGroups);
    updateField("availableTimeSlots", flattenAllSlots(nextGroups).join("\n"));
  };

  const handleGenerateSlots = () => {
    const availabilityError = validateAvailability(startTime, endTime, slotDuration, selectedDates);

    if (availabilityError) {
      window.alert(availabilityError);
      return;
    }

    const generated = generateTimeSlots(startTime, endTime, Number(slotDuration));

    if (!generated.length) {
      window.alert("No complete slots can be generated for the chosen times. Please adjust the range or interval.");
      return;
    }

    commitGeneratedSlots(selectedDates.map((date) => ({ date, slots: [...generated] })));
  };

  const removeSlotEverywhere = (slot) => {
    commitGeneratedSlots(
      generatedTimeSlots.map((group) => ({
        ...group,
        slots: group.slots.filter((item) => item !== slot),
      })),
    );
  };

  const clearGeneratedSlots = () => {
    commitGeneratedSlots(generatedTimeSlots.map((group) => ({ ...group, slots: [] })));
  };

  const imagePath = currentValue("imagePath", doctor.imagePath ?? "");
  const formPreviewUrl = currentValue("imagePreviewUrl", "");
  const imagePreviewUrl = imagePreviewSrc || formPreviewUrl || resolveDoctorImageSrc(doctor);
  const selectedImageLabel =
    form?.imageFile?.name || (imagePath ? imagePath.split("/").filter(Boolean).pop() : "No image selected");

  useEffect(() => {
    return () => {
      const currentPreview = imagePreviewRef.current;
      if (typeof currentPreview === "string" && currentPreview.startsWith("blob:")) {
        URL.revokeObjectURL(currentPreview);
      }
    };
  }, []);

  const updatePreviewSrc = (nextPreview) => {
    const currentPreview = imagePreviewRef.current;

    if (typeof currentPreview === "string" && currentPreview.startsWith("blob:")) {
      URL.revokeObjectURL(currentPreview);
    }

    imagePreviewRef.current = nextPreview;
    setImagePreviewSrc(nextPreview);
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    updatePreviewSrc(previewUrl);
    setForm((current) => ({
      ...current,
      imageFile: file,
      imagePreviewUrl: previewUrl,
      imagePath: "",
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 pb-28 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {doctor?.id ? "Edit Doctor" : "Add New Doctor"}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">
            {doctor?.id ? (doctor.name ?? "Unnamed Doctor") : "Create a new doctor"}
          </h3>
        </div>

        <Badge tone={badgeTone(form?.verificationStatus ?? doctor.verificationStatus ?? doctor.status).color}>
          {form?.verificationStatus ?? doctor.verificationStatus ?? doctor.status ?? "Pending"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Name"
          value={currentValue("name", doctor.name)}
          onChange={(value) => updateField("name", value)}
          placeholder="Doctor name"
        />
        <Field
          label="Email"
          value={currentValue("email", doctor.email)}
          onChange={(value) => updateField("email", value)}
          placeholder="doctor@example.com"
          type="email"
        />
        <SelectField
          label="Gender"
          value={currentValue("gender", doctor.gender ?? "")}
          onChange={(value) => updateField("gender", value)}
          options={genderOptions}
        />
        <Field
          label={doctor?.id ? "New Password" : "Password"}
          value={currentValue("password", "")}
          onChange={(value) => updateField("password", value)}
          placeholder={doctor?.id ? "Leave blank to keep current password" : "Set a login password"}
          type="password"
        />
        <Field
          label={doctor?.id ? "Confirm New Password" : "Confirm Password"}
          value={currentValue("passwordConfirmation", "")}
          onChange={(value) => updateField("passwordConfirmation", value)}
          placeholder="Re-enter password"
          type="password"
        />
        <Field
          label="Specialty"
          value={currentValue("specialty", doctor.specialty ?? doctor.speciality)}
          onChange={(value) => updateField("specialty", value)}
          placeholder="Cardiology"
        />
        <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Availability
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Select the available working dates and generate the time slots for each one.
              </p>
            </div>
            <p className="text-xs font-medium text-slate-600">
              Selected: {selectedDates.length}
            </p>
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">Available Dates</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedDates.length
                      ? `${selectedDates.length} available date${selectedDates.length === 1 ? "" : "s"} selected. Click a chosen day again to unselect it.`
                      : "Click any day on the calendar to add it as an available working date."}
                  </p>
                </div>
              </div>

              <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <DayPicker
                  mode="multiple"
                  selected={selectedDates.map(parseDateKeyToDate)}
                  onSelect={handleDateSelect}
                  className="mx-auto"
                />
              </div>

              <div className="mt-3 flex justify-center p-2">
                {selectedDates.length ? (
                  <button
                    type="button"
                    onClick={clearAllDates}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:text-rose-600"
                  >
                    Clear all ({selectedDates.length})
                  </button>
                ) : null}
              </div>

              <div className="mt-3">
                {selectedDates.length ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedDates.map((dateKey) => (
                      <button
                        key={dateKey}
                        type="button"
                        onClick={() => removeDate(dateKey)}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 gap-3 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                      >
                        {formatDateLabel(dateKey)}
                        <span className="text-rose-500" aria-hidden="true">
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    No available dates selected.
                  </p>
                )}
              </div>
            </div>
        <div>
                    <p className="text-sm font-bold text-slate-900">Available Time Slots</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Set a daily working window and interval, then generate slots for all selected dates.
                    </p>

                    <div className="mt-3 space-y-4">
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Start Time</span>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(event) => setStartTime(event.target.value)}
                          className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">End Time</span>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(event) => setEndTime(event.target.value)}
                          className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Interval / Slot Duration</span>
                        <select
                          value={slotDuration}
                          onChange={(event) => setSlotDuration(event.target.value)}
                          className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        >
                          <option value="10">10 minutes</option>
                          <option value="20">20 minutes</option>
                          <option value="30">30 minutes</option>
                          <option value="60">60 minutes</option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleGenerateSlots}
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        Generate Slots
                      </button>
                      {generatedTimeSlots.some((group) => group.slots.length) ? (
                        <button
                          type="button"
                          onClick={clearGeneratedSlots}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:text-rose-600"
                        >
                          Clear all
                        </button>
                      ) : null}

                         {generatedTimeSlots.some((group) => group.slots.length) ? (
                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Generated Time Slots ({flattenAllSlots(generatedTimeSlots).length})
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {flattenAllSlots(generatedTimeSlots).map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => removeSlotEverywhere(slot)}
                          title="Click to remove this slot"
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6">
                    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      No generated slots yet.
                    </p>
                  </div>
                )}

                    </div>
                  </div>
                </div>

               
              </div>
        <Field
          label="Consultation Fee"
          value={currentValue("consultationFee", doctor.consultationFee ?? "")}
          onChange={(value) => updateField("consultationFee", value)}
          placeholder="1200"
          type="number"
        />
        <Field
          label="Follow-up Fee"
          value={currentValue("followUpFee", doctor.followUpFee ?? "")}
          onChange={(value) => updateField("followUpFee", value)}
          placeholder="600"
          type="number"
        />
        <Field
          label="Phone"
          value={currentValue("phone", doctor.phone)}
          onChange={(value) => updateField("phone", value)}
          placeholder="01700000000"
        />
        <Field
          label="City"
          value={currentValue("city", doctor.city)}
          onChange={(value) => updateField("city", value)}
          placeholder="Dhaka"
        />
        <Field
          label="License No"
          value={currentValue("licenseNo", doctor.licenseNo)}
          onChange={(value) => updateField("licenseNo", value)}
          placeholder="BMDC-123456"
        />
        <SelectField
          label="Verification Status"
          value={currentValue("verificationStatus", doctor.verificationStatus ?? "pending")}
          onChange={(value) => updateField("verificationStatus", value)}
          options={verificationStatusOptions}
        />
        <SelectField
          label="Status"
          value={currentValue("status", doctor.status ?? "active")}
          onChange={(value) => updateField("status", value)}
          options={statusOptions}
        />
        <div className="md:col-span-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          {doctor?.id
            ? "Leave the password fields blank to keep the current doctor login. Fill both fields to update it."
            : "Set the doctor login password here. The doctor can sign in with this email and password right away."}
        </div>
        <div className="md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Doctor Image
              </p>
              {showImageControls ? (
                <p className="mt-1 text-sm text-slate-500">
                  Upload a doctor image from your computer.
                </p>
              ) : null}
            </div>
            <p className="text-xs font-medium text-slate-600">
              Selected: {selectedImageLabel}
            </p>
          </div>

          <div className="mt-3 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="relative h-28 w-full overflow-hidden rounded-xl border border-slate-200 bg-white sm:h-36">
              {/* Use a plain image tag so blob previews render instantly during upload. */}
              <img
                src={imagePreviewUrl || DOCTOR_IMAGE_FALLBACK}
                alt={doctor.name ?? "Doctor"}
                className="h-full w-full object-contain p-3"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => {
                  setShowImageControls((current) => !current);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                {showImageControls ? "Hide Image" : "Choose Image"}
              </button>
            </div>

            {showImageControls ? (
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 transition hover:border-slate-400 hover:bg-slate-50">
                  <span>Choose image file</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Browse
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>

                <p className="text-xs text-slate-500">
                  Pick an image file from your computer. It will be saved in the doctor record.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 z-40 w-[min(92vw,24rem)] -translate-x-1/2 px-4 py-3">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onSave}
            className="inline-flex min-w-32 items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {doctor?.id ? "Save Changes" : "Create Doctor"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-w-24 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Badge({ children, tone = "slate", className = "" }) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneClasses[tone] ?? toneClasses.slate} ${className}`}
    >
      {children}
    </span>
  );
}

function badgeTone(label) {
  const text = String(label ?? "").toLowerCase();

  if (text.includes("approved") || text.includes("active")) {
    return {
      color: "emerald",
      icon: "text-emerald-500",
      text: "text-emerald-700",
    };
  }

  if (text.includes("pending") || text.includes("review") || text.includes("waiting")) {
    return {
      color: "amber",
      icon: "text-amber-500",
      text: "text-amber-700",
    };
  }

  if (text.includes("reject") || text.includes("suspend") || text.includes("inactive")) {
    return {
      color: "rose",
      icon: "text-rose-500",
      text: "text-rose-700",
    };
  }

  return {
    color: "slate",
    icon: "text-slate-400",
    text: "text-slate-600",
  };
}

const AVAILABILITY_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const AVAILABILITY_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const AVAILABILITY_DURATIONS = ["10", "20", "30", "60"];

function availabilityDateSource(form, doctor) {
  return form?.availableDates ?? doctor?.availableDates ?? doctor?.available_dates ?? [];
}

function availabilitySlotSource(form, doctor) {
  return form?.availableTimeSlots ?? doctor?.availableTimeSlots ?? doctor?.available_time_slots ?? "";
}

function normalizeAvailableDates(value) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? splitDoctorLines(value)
      : [];

  return [
    ...new Set(
      raw
        .map((item) => String(item ?? "").trim())
        .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)),
    ),
  ];
}

function normalizeSlotList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return splitDoctorLines(value);
  }

  return [];
}

function splitDoctorLines(value) {
  return String(value ?? "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDateKeyToDate(dateKey) {
  const parts = String(dateKey).split("-").map(Number);

  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return new Date();
  }

  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDateKey(date) {
  if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateKey) {
  const date = parseDateKeyToDate(dateKey);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  const weekday = AVAILABILITY_WEEKDAYS[date.getDay()] ?? "";
  const month = AVAILABILITY_MONTHS[date.getMonth()] ?? "";
  return `${weekday}, ${month} ${date.getDate()}, ${date.getFullYear()}`;
}

function timeToMinutes(time) {
  if (!time) {
    return 0;
  }

  const parts = String(time).split(":").map(Number);

  if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part))) {
    return 0;
  }

  return parts[0] * 60 + parts[1];
}

function minutesToDisplay(totalMinutes) {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours24 = Math.floor(safeMinutes / 60) % 24;
  const minutes = safeMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  let hour12 = hours24 % 12;

  if (hour12 === 0) {
    hour12 = 12;
  }

  return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

function generateTimeSlots(startTime, endTime, durationMinutes) {
  const slots = [];
  const duration = Number(durationMinutes) || 0;

  if (!startTime || !endTime || duration <= 0) {
    return slots;
  }

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (endMinutes <= startMinutes) {
    return slots;
  }

  let currentMinutes = startMinutes;

  while (currentMinutes + duration <= endMinutes) {
    const nextMinutes = currentMinutes + duration;
    slots.push(`${minutesToDisplay(currentMinutes)} - ${minutesToDisplay(nextMinutes)}`);
    currentMinutes = nextMinutes;
  }

  return slots;
}

function buildInitialSlotList(dateKeys, slots) {
  return dateKeys.map((date) => ({ date, slots: [...normalizeSlotList(slots)] }));
}

function flattenAllSlots(groups) {
  const seen = new Set();
  const result = [];

  groups.forEach((group) => {
    (group.slots || []).forEach((slot) => {
      if (!seen.has(slot)) {
        seen.add(slot);
        result.push(slot);
      }
    });
  });

  return result;
}

function validateAvailability(startTime, endTime, slotDuration, selectedDates) {
  if (!selectedDates || !selectedDates.length) {
    return "Select at least one available date.";
  }

  if (!startTime) {
    return "Start time is required.";
  }

  if (!endTime) {
    return "End time is required.";
  }

  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    return "End time must be later than start time.";
  }

  const duration = Number(slotDuration);

  if (!Number.isFinite(duration) || duration <= 0) {
    return "Please choose a valid slot duration.";
  }

  if (!AVAILABILITY_DURATIONS.includes(String(slotDuration))) {
    return "The selected slot duration is not supported.";
  }

  return "";
}
