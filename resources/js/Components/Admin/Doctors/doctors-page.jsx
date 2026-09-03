"use client";

import Image from "@/Components/Image";
import { apiUrl } from "@/utils/api";
import { useMemo, useState } from "react";
import DoctorDetailsView from "./doctor_details_view";
import UpdateDoctorPage from "./update-doctor-page";

const DOCTOR_IMAGE_FALLBACK = "/images/doc1.png";

export default function DoctorsPage({
  doctors = [],
  loading,
  editingDoctor,
  editForm,
  setEditForm,
  deleteConfirmId,
  setDeleteConfirmId,
  onEdit,
  onUpdate,
  onDelete,
  onRefresh,
  onCancelEdit,
  onMessage,
  onAddNew,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("all");
  const [previewDoctorId, setPreviewDoctorId] = useState(null);

  const safeDoctors = useMemo(
    () => (Array.isArray(doctors) ? doctors : []),
    [doctors],
  );

  const filteredDoctors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return safeDoctors;
    }

    return safeDoctors.filter((doctor) => {
      const searchableText = [
        doctor.name,
        doctor.email,
        doctor.specialty,
        doctor.speciality,
        doctor.phone,
        doctor.city,
        doctor.licenseNo,
        doctor.status,
        doctor.verificationStatus,
        doctor.consultationFee,
        doctor.followUpFee,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [safeDoctors, searchQuery]);

  const doctorReportStats = useMemo(() => {
    const total = safeDoctors.length;
    const active = safeDoctors.filter((doctor) => {
      const status = String(doctor.status ?? "").toLowerCase();
      return status === "active" || status === "approved";
    }).length;
    const pending = safeDoctors.filter((doctor) => {
      const verification = String(doctor.verificationStatus ?? "").toLowerCase();
      const status = String(doctor.status ?? "").toLowerCase();
      return verification.includes("pending") || status.includes("pending");
    }).length;
    const approved = safeDoctors.filter((doctor) => {
      const verification = String(doctor.verificationStatus ?? "").toLowerCase();
      const status = String(doctor.status ?? "").toLowerCase();
      return verification.includes("approved") || status.includes("active");
    }).length;

    return {
      total,
      active,
      pending,
      approved,
      filtered: filteredDoctors.length,
    };
  }, [safeDoctors, filteredDoctors]);

  const previewDoctor = useMemo(() => {
    return filteredDoctors.find((doctor) => doctor.id === previewDoctorId) ?? null;
  }, [filteredDoctors, previewDoctorId]);

  function handleAddNewDoctor() {
    if (typeof onAddNew === "function") {
      onAddNew();
      return;
    }

    if (typeof onMessage === "function") {
      onMessage("Add New Doc flow is not wired yet.");
      return;
    }

    if (typeof window !== "undefined") {
      window.alert("Add New Doc flow is not wired yet.");
    }
  }

  function handleRefresh() {
    if (typeof onRefresh === "function") {
      void onRefresh();
    }
  }

  if (loading) {
    return (
      <PanelCard
        eyebrow="Doctor Management"
        title="Doctors"
        description="Loading all registered doctors..."
      >
        <div className="flex items-center justify-center py-16 text-sm font-medium text-slate-500">
          Loading doctors...
        </div>
      </PanelCard>
    );
  }

  if (safeDoctors.length === 0 && !editingDoctor) {
    return (
      <PanelCard
        eyebrow="Doctor Management"
        title="Doctors"
        description="View all registered doctors. Edit their profiles or delete them from the platform."
      >
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-700">
            No doctors found.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Refresh the list or check the backend connection.
          </p>
        </div>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      eyebrow="Doctor Management"
      title="Doctors"
      description=""
    >
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("all")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  viewMode === "all"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                All Doc
              </button>
              <button
                type="button"
                onClick={() => setViewMode("reports")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  viewMode === "reports"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Reports
              </button>
            </div>

            <p className="text-sm font-semibold text-slate-700">
              Total Doctors: {doctorReportStats.total}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="w-full sm:w-72">
              <span className="sr-only">Search Doctor</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search Doctor"
                className="w-full rounded-xl border border-black-500 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-white-500 focus:border-slate-400"
              />
            </label>

            <button
              type="button"
              onClick={handleAddNewDoctor}
              className="rounded-xl border border-black-500 bg-white px-4 py-2.5 text-sm font-semibold text-black-500 transition hover:bg-red-50"
            >
              Add New Doc
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {viewMode === "reports" ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DoctorReportCard
              label="Active Doctors"
              value={doctorReportStats.active}
              tone="emerald"
              detail="Doctors currently active on the platform."
            />
            <DoctorReportCard
              label="Verified"
              value={doctorReportStats.approved}
              tone="blue"
              detail="Profiles approved or marked active."
            />
            <DoctorReportCard
              label="Pending Review"
              value={doctorReportStats.pending}
              tone="amber"
              detail="Doctors waiting for manual verification."
            />
            <DoctorReportCard
              label="Filtered Results"
              value={doctorReportStats.filtered}
              tone="slate"
              detail="Doctors matching the current search."
            />
          </div>
        ) : null}
      </div>

      {editingDoctor ? (
        <DoctorEditForm
          key={editingDoctor.id ?? "new-doctor"}
          doctor={editingDoctor}
          form={editForm}
          setForm={setEditForm}
          onSave={() => onUpdate(editingDoctor.id, editForm)}
          onCancel={onCancelEdit}
        />
      ) : previewDoctor ? (
        <DoctorPreviewCard
          doctor={previewDoctor}
          onClose={() => setPreviewDoctorId(null)}
          onEdit={() => {
            onEdit(previewDoctor);
            setPreviewDoctorId(null);
          }}
          onDelete={() => {
            setDeleteConfirmId(previewDoctor.id);
            setPreviewDoctorId(null);
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                onEdit={() => onEdit(doctor)}
                onView={() => setPreviewDoctorId(doctor.id)}
                onDelete={() => setDeleteConfirmId(doctor.id)}
                showDeleteConfirm={deleteConfirmId === doctor.id}
                onConfirmDelete={async () => {
                  await onDelete(doctor.id);
                  setDeleteConfirmId(null);
                }}
                onCancelDelete={() => setDeleteConfirmId(null)}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center text-sm font-medium text-slate-500">
              No doctors match &quot;{searchQuery}&quot;. Try another search or clear the filter.
            </div>
          )}
        </div>
      )}
    </PanelCard>
  );
}

function DoctorCard({
  doctor,
  onView,
  onEdit,
  onDelete,
  showDeleteConfirm,
  onConfirmDelete,
  onCancelDelete,
}) {
  const statusLabel = doctor.verificationStatus ?? doctor.status ?? "Pending";
  const statusTone = badgeTone(statusLabel);
  const consultationFee = formatCurrencyValue(doctor.consultationFee ?? doctor.fees ?? doctor.followUpFee);
  const avatarSrc = resolveDoctorImageSrc(doctor);
  const avatarInitial = getDoctorInitial(doctor.name);
  const showAvatarFallback = avatarSrc === DOCTOR_IMAGE_FALLBACK;

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-blue-50">
            <Image
              key={avatarSrc}
              src={avatarSrc}
              alt={doctor.name ?? "Doctor"}
              fill
              className="object-cover"
              sizes="44px"
              unoptimized
            />
            {showAvatarFallback ? (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold text-blue-600">
                {avatarInitial}
              </span>
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-bold text-slate-900">
                {doctor.name ?? "Unnamed Doctor"}
              </h3>
              <Badge tone={statusTone.color} className="hidden sm:inline-flex">
                {statusLabel}
              </Badge>
            </div>

            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
              <MailIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{doctor.email ?? "N/A"}</span>
            </div>
          </div>
        </div>

        <div className="min-w-[130px]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Specialty
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-700">
            {doctor.specialty ?? doctor.speciality ?? "General Medicine"}
          </p>
        </div>

        <div className="min-w-[110px]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Consultation
          </p>
          <p className="mt-0.5 text-sm font-bold text-emerald-600">
            {consultationFee}
          </p>
        </div>

        <div className="hidden min-w-[190px] xl:block">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <PhoneIcon className="h-3.5 w-3.5 text-slate-400" />
            <span>{doctor.phone ?? "N/A"}</span>
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPinIcon className="h-3.5 w-3.5 text-slate-400" />
            <span>{doctor.city ?? "N/A"}</span>
            <span className="text-slate-300">|</span>
            <span>{doctor.licenseNo ?? "N/A"}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 border-t border-slate-100 pt-3 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
          <button
            type="button"
            title="View Details"
            onClick={onView}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <EyeIcon className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Edit Doctor"
            onClick={onEdit}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 transition hover:bg-blue-100"
          >
            <PencilIcon className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Delete Doctor"
            onClick={onDelete}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500 lg:hidden">
        <div className="flex items-center gap-1.5">
          <PhoneIcon className="h-3.5 w-3.5 text-slate-400" />
          <span>{doctor.phone ?? "N/A"}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <MapPinIcon className="h-3.5 w-3.5 text-slate-400" />
          <span>{doctor.city ?? "N/A"}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <AwardIcon className="h-3.5 w-3.5 text-slate-400" />
          <span>{doctor.licenseNo ?? "N/A"}</span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <CheckCircleIcon className={`h-3.5 w-3.5 ${statusTone.icon}`} />
          <span className={`font-medium ${statusTone.text}`}>{statusLabel}</span>
        </div>
      </div>

      {showDeleteConfirm ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-700">Delete this doctor?</p>
          <p className="mt-1 text-xs text-red-600">
            This action cannot be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onConfirmDelete}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
            >
              Yes, Delete
            </button>
            <button
              type="button"
              onClick={onCancelDelete}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DoctorPreviewCard({ doctor, onClose, onEdit, onDelete }) {
  return <DoctorDetailsView doctor={doctor} onBack={onClose} onEdit={onEdit} onDelete={onDelete} />;
}

function DoctorEditForm(props) {
  return <UpdateDoctorPage {...props} />;
}

function DoctorReportCard({ label, value, tone = "slate", detail }) {
  const toneClasses = {
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClasses[tone] ?? toneClasses.slate}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      {detail ? <p className="mt-2 text-sm text-slate-600">{detail}</p> : null}
    </div>
  );
}

function PanelCard({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-lenier-to-br from-white to-slate-50 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="mb-5">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
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

function getDoctorInitial(name) {
  const trimmed = String(name ?? "").trim();

  if (!trimmed) {
    return "D";
  }

  const firstWord = trimmed.split(/\s+/)[0];
  return firstWord.charAt(0).toUpperCase() || "D";
}

function resolveDoctorImageSrc(doctor) {
  const candidates = [doctor?.imageUrl, doctor?.imagePath, doctor?.avatar];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const value = candidate.trim();
    if (!value) {
      continue;
    }

    if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) {
      if (value.startsWith("blob:") || value.startsWith("data:")) {
        return value;
      }

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

    return apiUrl(`/doctor-images/${value}`);
  }

  return DOCTOR_IMAGE_FALLBACK;
}

function SvgIcon({ className = "h-4 w-4", children }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function EyeIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="3" />
    </SvgIcon>
  );
}

function PencilIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M16.862 4.487a2.2 2.2 0 1 1 3.111 3.111L7.5 20.071 3 21l.929-4.5L16.862 4.487Z" />
    </SvgIcon>
  );
}

function TrashIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" />
      <path d="M19 6l-1 13.2A1.8 1.8 0 0 1 16.2 21H7.8A1.8 1.8 0 0 1 6 19.2L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </SvgIcon>
  );
}

function PhoneIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M5 4.5c0-.8.6-1.5 1.4-1.5h2.1c.7 0 1.3.5 1.4 1.2l.5 2.7c.1.7-.2 1.3-.8 1.7l-1.4.9c1 2 2.6 3.6 4.6 4.6l.9-1.4c.4-.6 1-.9 1.7-.8l2.7.5c.7.1 1.2.7 1.2 1.4v2.1c0 .8-.7 1.4-1.5 1.4C10.6 20 4 13.4 4 5.5Z" />
    </SvgIcon>
  );
}

function AwardIcon(props) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="8" r="4.5" />
      <path d="M9.5 12.2 8 21l4-2 4 2-1.5-8.8" />
    </SvgIcon>
  );
}

function MapPinIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </SvgIcon>
  );
}

function CheckCircleIcon(props) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.4 2.4L15.8 9.5" />
    </SvgIcon>
  );
}

function MailIcon(props) {
  return (
    <SvgIcon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </SvgIcon>
  );
}

