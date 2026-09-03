"use client";

import Image from "@/Components/Image";
import { Link } from "@inertiajs/react";
import { apiUrl } from "@/utils/api";

export const DOCTOR_IMAGE_FALLBACK =
  "/images/doctor-learning-medical-data-at-office-concept-free-vector.jpg";

export function resolveDoctorImageSrc(doctorOrUrl) {
  const candidates = [];

  if (typeof doctorOrUrl === "string") {
    candidates.push(doctorOrUrl);
  } else if (doctorOrUrl && typeof doctorOrUrl === "object") {
    candidates.push(
      doctorOrUrl.imageUrl,
      doctorOrUrl.imagePath,
      doctorOrUrl.image_path,
      doctorOrUrl.avatar,
      doctorOrUrl.image,
    );
  }

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const value = candidate.trim();
    if (!value) {
      continue;
    }

    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }

    if (value.startsWith("blob:") || value.startsWith("data:")) {
      return value;
    }

    if (value.startsWith("images/doctors/")) {
      return `/${value}`;
    }

    if (value.startsWith("doctors/")) {
      return apiUrl(`/doctor-images/${value.split("/").pop()}`);
    }

    if (value.startsWith("/images/doctors/")) {
      return value;
    }

    if (
      value.startsWith("/doctor-images/") ||
      value.startsWith("doctor-images/") ||
      value.startsWith("/api/doctor-images/") ||
      value.startsWith("api/doctor-images/")
    ) {
      const normalizedPath = value
        .replace(/^\/api/, "")
        .replace(/^api/, "")
        .replace(/^doctor-images\//, "/doctor-images/")
        .replace(/^\/doctor-images\//, "/doctor-images/");

      return apiUrl(normalizedPath);
    }

    if (value.startsWith("/")) {
      return encodeURI(value);
    }

    return apiUrl(`/doctor-images/${value}`);
  }

  return DOCTOR_IMAGE_FALLBACK;
}
export function formatConsultationFee(value) {
  if (value === null || value === undefined || value === "") {
    return "Consultation fee not available";
  }

  const numericValue =
    typeof value === "string"
      ? Number(value.replace(/[^0-9.-]/g, ""))
      : Number(value);

  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return `Consultation fee: BDT ${new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 0,
  }).format(Math.round(numericValue))}`;
}

export default function DoctorCard({ doctor, showAction = true }) {
  const imageSrc = resolveDoctorImageSrc(doctor);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="relative aspect-[1.12] w-full bg-[linear-gradient(180deg,#f3f7ff_0%,#eaf1ff_100%)]">
        <Image
          src={imageSrc}
          alt={doctor?.name ?? "Doctor"}
          fill
          sizes="(min-width: 1024px) 320px, 100vw"
          className="object-contain object-center px-4 py-3"
        />
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm backdrop-blur">
          Doctor
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-4 py-4">
        <div className="min-w-0">
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

          <h2 className="mt-2 truncate text-[15px] font-bold leading-5 text-slate-950">
            {doctor?.name ?? "Unnamed Doctor"}
          </h2>

          <p className="mt-1 truncate text-[12px] font-medium leading-4 text-slate-600">
            {doctor?.specialty ?? "Specialty not available"}
          </p>

          <div className="mt-2 space-y-1 text-[11px] leading-4 text-slate-500">
            <p className="truncate font-medium text-slate-600">
              {doctor?.chamberAddress || "Chamber address not available"}
            </p>
            <p className="truncate">
              {doctor?.location ?? "Location not available"}
            </p>
          </div>

          <p className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            {formatConsultationFee(doctor?.consultationFee ?? doctor?.consultation_fee)}
          </p>
        </div>

        {showAction ? (
          <div className="mt-auto pt-4">
            <Link
              href={`/appointment/book?doctorId=${doctor?.id}`}
              className="inline-flex h-9 w-full items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground transition hover:bg-brand-hover"
            >
              Book Appointment
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}
