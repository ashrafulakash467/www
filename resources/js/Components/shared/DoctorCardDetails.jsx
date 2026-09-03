"use client";

import Image from "@/Components/Image";
import {
  formatConsultationFee,
  resolveDoctorImageSrc,
} from "./DoctorCard";

export default function DoctorCardDetails({ doctor }) {
  const imageSrc = resolveDoctorImageSrc(doctor);
  const verificationStatus = resolveVerificationStatus(doctor);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] md:flex-row">
      <div className="relative aspect-[1.25] w-full shrink-0 bg-[linear-gradient(180deg,#f3f7ff_0%,#eaf1ff_100%)] md:w-72">
        <Image
          src={imageSrc}
          alt={doctor?.name ?? "Doctor"}
          fill
          sizes="(min-width: 1024px) 320px, 100vw"
          className="object-contain object-center px-4 py-3"
        />
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm backdrop-blur">
          Doctor Details
        </div>
      </div>

      <div className="flex-1 space-y-4 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
              doctor?.isAvailable
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                doctor?.isAvailable ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            {doctor?.isAvailable ? "Available" : "Unavailable"}
          </span>

          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
            {doctor?.gender ?? "Gender not set"}
          </span>
        </div>

        <div>
          <h2 className="text-[16px] font-bold leading-5 text-slate-950">
            {doctor?.name ?? "Unnamed Doctor"}
          </h2>
          <p className="mt-1 text-[12px] font-medium leading-4 text-slate-600">
            {doctor?.specialty ?? "Specialty not available"}
          </p>
        </div>

        <div className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
          <InfoRow label="Chamber" value={doctor?.chamberAddress || "Not available"} />
          <InfoRow label="Location" value={doctor?.location ?? "Location not available"} />
          <InfoRow label="Consultation fee" value={formatConsultationFee(doctor?.consultationFee ?? doctor?.consultation_fee)} />
          <InfoRow
            label="Verification Status"
            value={verificationStatus.label}
            tone={verificationStatus.tone}
          />
        </div>

        {doctor?.bio ? (
          <p className="text-sm leading-6 text-slate-600">
            {doctor.bio}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function InfoRow({ label, value, tone = "slate" }) {
  const toneClasses = {
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    slate: "border-slate-200 bg-slate-50 text-slate-900",
  };

  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 inline-flex max-w-full rounded-full border px-2.5 py-1 text-sm font-semibold ${toneClasses[tone] ?? toneClasses.slate}`}
      >
        <span className="truncate">{value}</span>
      </p>
    </div>
  );
}

function resolveVerificationStatus(doctor) {
  const rawValue =
    doctor?.verificationStatus ??
    doctor?.verification_status ??
    doctor?.status ??
    doctor?.verification ??
    doctor?.isVerified ??
    doctor?.is_verified;

  if (typeof rawValue === "boolean") {
    return rawValue
      ? { label: "Approved", tone: "emerald" }
      : { label: "Pending", tone: "amber" };
  }

  const normalized = String(rawValue ?? "").trim().toLowerCase();

  if (!normalized) {
    if (doctor?.isAvailable === true) {
      return { label: "Approved", tone: "emerald" };
    }

    return { label: "Pending", tone: "amber" };
  }

  if (
    normalized.includes("approved") ||
    normalized.includes("verified") ||
    normalized.includes("active")
  ) {
    return { label: capitalizeLabel(normalized), tone: "emerald" };
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("review") ||
    normalized.includes("waiting")
  ) {
    return { label: capitalizeLabel(normalized), tone: "amber" };
  }

  if (
    normalized.includes("reject") ||
    normalized.includes("suspend") ||
    normalized.includes("inactive")
  ) {
    return { label: capitalizeLabel(normalized), tone: "rose" };
  }

  return { label: capitalizeLabel(normalized), tone: "slate" };
}

function capitalizeLabel(value) {
  return String(value)
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
