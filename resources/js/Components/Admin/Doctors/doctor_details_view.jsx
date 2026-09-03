"use client";

import Image from "@/Components/Image";
import { useState } from "react";
import { DOCTOR_IMAGE_FALLBACK, resolveDoctorImageSrc } from "@/Components/shared/DoctorCard";

export default function DoctorDetailsView({ doctor, onBack, onEdit, onDelete }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const avatarSrc = resolveDoctorImageSrc(doctor);
  const avatarInitial = getDoctorInitial(doctor?.name);
  const showAvatarFallback = avatarSrc === DOCTOR_IMAGE_FALLBACK;
  const consultationFee = formatCurrencyValue(doctor?.consultationFee ?? doctor?.fees ?? doctor?.followUpFee);
  const followUpFee = formatCurrencyValue(doctor?.followUpFee);
  const statusLabel = doctor?.verificationStatus ?? doctor?.status ?? "Pending";
  const statusTone = badgeTone(statusLabel);
  const specialties = [doctor?.specialty, doctor?.subSpecialty].filter(Boolean);
  const availableDates = normalizeList(doctor?.availableDates ?? doctor?.available_dates);
  const availableTimeSlots = normalizeList(doctor?.availableTimeSlots ?? doctor?.available_time_slots);
  const qualifications = normalizeQualifications(doctor?.qualification);

  async function handleDelete() {
    if (typeof onDelete === "function") {
      await onDelete();
    }
    setShowDeleteConfirm(false);
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-blue-50">
              <Image
                key={avatarSrc}
                src={avatarSrc}
                alt={doctor?.name ?? "Doctor"}
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
              {showAvatarFallback ? (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xl font-bold text-blue-600">
                  {avatarInitial}
                </span>
              ) : null}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-2xl font-bold text-slate-950">
                  {doctor?.name ?? "Unnamed Doctor"}
                </h2>
                <Badge tone={statusTone.color}>{statusLabel}</Badge>
              </div>

              <p className="mt-1 text-sm text-slate-500">{doctor?.email ?? "N/A"}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {specialties.length ? (
                  specialties.map((item) => <Tag key={item}>{item}</Tag>)
                ) : (
                  <Tag>General Medicine</Tag>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Edit Doctor
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoPair label="Phone" value={doctor?.phone ?? "N/A"} />
          <InfoPair label="Location" value={doctor?.city ?? doctor?.state ?? doctor?.country ?? "N/A"} />
          <InfoPair label="License No" value={doctor?.licenseNo ?? "N/A"} />
          <InfoPair label="Consultation" value={consultationFee} />
          <InfoPair label="Follow-up" value={followUpFee} />
          <InfoPair label="Status" value={doctor?.status ?? "N/A"} />
          <InfoPair label="Verification" value={doctor?.verificationStatus ?? "N/A"} />
          <InfoPair label="Created" value={formatLongDate(doctor?.createdAt)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Doctor Profile</p>
            <div className="mt-4 space-y-3">
              <InfoPair label="Gender" value={doctor?.gender ?? "N/A"} />
              <InfoPair label="Bio" value={doctor?.bio ?? "N/A"} />
              <InfoPair label="Qualification" value={doctor?.qualification ?? "N/A"} />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Qualifications</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {qualifications.length ? qualifications.map((item) => <Tag key={item}>{item}</Tag>) : <Tag>N/A</Tag>}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Availability</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Available Dates</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {availableDates.length ? availableDates.map((item) => <Tag key={item}>{item}</Tag>) : <Tag>No dates</Tag>}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Time Slots</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {availableTimeSlots.length ? availableTimeSlots.map((item) => <Tag key={item}>{item}</Tag>) : <Tag>No slots</Tag>}
                </div>
              </div>
            </div>
          </section>
        </div>

      </div>

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.24)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Confirm Delete</p>
            <h3 className="mt-2 text-lg font-bold text-slate-950">
              Delete {doctor?.name ?? "this doctor"}?
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This action cannot be undone. The doctor record will be removed permanently.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="rounded-xl border border-rose-600 bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Badge({ children, tone = "slate" }) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${toneClasses[tone] ?? toneClasses.slate}`}>
      {children}
    </span>
  );
}

function Tag({ children }) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

function InfoPair({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function badgeTone(label) {
  const text = String(label ?? "").toLowerCase();

  if (text.includes("approved") || text.includes("active")) {
    return { color: "emerald" };
  }

  if (text.includes("pending") || text.includes("review") || text.includes("waiting")) {
    return { color: "amber" };
  }

  if (text.includes("reject") || text.includes("suspend") || text.includes("inactive")) {
    return { color: "rose" };
  }

  return { color: "slate" };
}

function formatCurrencyValue(value) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  const numericValue =
    typeof value === "string"
      ? Number(value.replace(/[^0-9.-]/g, ""))
      : Number(value);

  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return `BDT ${new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 0,
  }).format(Math.round(numericValue))}`;
}

function formatLongDate(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getDoctorInitial(name) {
  const trimmed = String(name ?? "").trim();

  if (!trimmed) {
    return "D";
  }

  return trimmed.split(/\s+/)[0].charAt(0).toUpperCase() || "D";
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeQualifications(value) {
  const items = normalizeList(value);

  return items.length ? items : [];
}
