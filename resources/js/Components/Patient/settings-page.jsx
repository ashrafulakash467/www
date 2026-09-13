"use client";

import { Link } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, getStoredUser, persistAuthSession } from "@/utils/api";
import { Icon, InfoCard } from "@/Components/Patient/dashboard-shared";

export default function PatientSettingsPage({ initialPatient }) {
  const [patient, setPatient] = useState(() =>
    normalizePatientUser(initialPatient ?? getStoredUser("patient")),
  );
  const [form, setForm] = useState(() =>
    buildProfileForm(initialPatient ?? getStoredUser("patient")),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setToastMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setError("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    const nextUser = normalizePatientUser(initialPatient);

    if (nextUser) {
      syncPatientCache(nextUser);
    }
  }, [initialPatient]);

  const completion = useMemo(() => {
    const values = [
      form.name,
      form.email,
      form.phone,
      form.mrn,
      form.gender,
      form.bloodGroup,
      form.dateOfBirth,
      form.location,
    ];

    return Math.round((values.filter(Boolean).length / values.length) * 100);
  }, [form]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    setError("");
    setToastMessage("");
  }

  function resetForm() {
    const cachedPatient = normalizePatientUser(getStoredUser("patient")) ?? patient;
    setForm(buildProfileForm(cachedPatient));
    setError("");
    setToastMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = buildProfilePayload(form);
    const validationError = validateProfilePayload(payload);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError("");
    setToastMessage("");

    try {
      const { response, result } = await savePatientProfile(payload);

      if (!response) {
        setError("Could not reach the API. Please check your connection and try again.");
        return;
      }

      if (!response.ok) {
        setError(result?.message ?? "Could not update your profile.");
        return;
      }

      const nextUser = normalizePatientUser(result?.user ?? {
        ...(patient ?? {}),
        ...payload,
        patient: {
          ...((patient?.patient) ?? {}),
          mrn: payload.mrn,
          gender: payload.gender,
          bloodGroup: payload.bloodGroup,
          dateOfBirth: payload.dateOfBirth,
          city: payload.city,
          state: payload.state,
        },
      });

      setPatient(nextUser);
      setForm(buildProfileForm(nextUser));
      syncPatientCache(nextUser);
      setToastMessage(result?.message ?? "Profile updated successfully.");
    } catch {
      setError("Could not update your profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
        <header className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              Patient Settings
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Update your profile
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/patient/dashboard"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Back to dashboard
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl font-bold text-emerald-700 shadow-sm">
                {getInitials(patient?.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-slate-950">
                  {patient?.name || "Patient"}
                </p>
                <p className="truncate text-sm text-slate-500">
                  {patient?.email || "No email found"}
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <InfoCard title="Profile Completion" value={`${completion}%`} />
              <InfoCard title="Status" value={formatStatus(patient?.status)} />
              {/* <InfoCard title="MRN" value={patient?.patient?.mrn || "N/A"} /> */}
              <InfoCard
                title="Location"
                value={formatLocation({
                  city: patient?.patient?.city,
                  state: patient?.patient?.state,
                }) || "N/A"}
              />
            </div>
          </aside>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                  Edit Profile
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">
                  Contact and patient details
                </h2>
              </div>

              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <Icon name="settings" />
                Settings
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Full Name" name="name" value={form.name} onChange={updateField} />

                <Field
                label="Email Address"
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                />

                <Field
                    label="Phone Number"
                    name="phone"
                    value={form.phone}
                    onChange={(e) =>
                        updateField({
                            target: {
                                name: "phone",
                                value: e.target.value.replace(/\D/g, ""),
                            },
                        })
                    }
                />

                {/* <Field label="MRN" name="mrn" value={form.mrn} onChange={updateField} /> */}
                <Field
                  label="Gender"
                  name="gender"
                  value={form.gender}
                  onChange={updateField}
                  options={["Male", "Female", "Other"]}
                  placeholder="Select gender"
                />
                <Field
                  label="Blood Group"
                  name="bloodGroup"
                  value={form.bloodGroup}
                  onChange={updateField}
                  options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
                  placeholder="Select blood group"
                />
                <Field label="Date of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={updateField} />
                <Field
                  label="Location"
                  name="location"
                  value={form.location}
                  onChange={updateField}
                  placeholder="Dhaka/Uttara-10"
                />
                <Field
                  label="Current Password"
                  name="currentPassword"
                  type="password"
                  value={form.currentPassword}
                  onChange={updateField}
                  placeholder="Enter current password"
                />
                <Field
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={form.newPassword}
                  onChange={updateField}
                  placeholder="Enter new password"
                />
                <Field
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={updateField}
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3 px-4 sm:px-0">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
              {error}
            </div>
          ) : null}

          {toastMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
              {toastMessage}
            </div>
          ) : null}
        </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", placeholder, options }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {options?.length ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
        >
          <option value="" disabled hidden>
            {placeholder ?? "Select"}
          </option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
        />
      )}
    </label>
  );
}

function buildProfileForm(user) {
  const normalizedUser = normalizePatientUser(user);
  const patient = normalizedUser?.patient ?? {};

  return {
    name: normalizedUser?.name ?? "",
    email: normalizedUser?.email ?? "",
    phone: normalizedUser?.phone ?? "",
    mrn: patient.mrn ?? "",
    gender: patient.gender ?? "",
    bloodGroup: patient.bloodGroup ?? "",
    dateOfBirth: formatDateForInput(patient.dateOfBirth),
    location: formatLocation({
      city: patient.city,
      state: patient.state,
    }),
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
}

function buildProfilePayload(form) {
  const { city, state } = splitLocation(form.location);

  return {
    name: String(form.name ?? "").trim(),
    email: String(form.email ?? "").trim(),
    phone: String(form.phone ?? "").trim() || null,
    mrn: String(form.mrn ?? "").trim() || null,
    gender: String(form.gender ?? "").trim() || null,
    bloodGroup: String(form.bloodGroup ?? "").trim() || null,
    dateOfBirth: String(form.dateOfBirth ?? "").trim() || null,
    city,
    state,
    currentPassword: String(form.currentPassword ?? "").trim() || null,
    newPassword: String(form.newPassword ?? "").trim() || null,
    confirmPassword: String(form.confirmPassword ?? "").trim() || null,
  };
}

function validateProfilePayload(payload) {
  if (!payload.name) {
    return "Name is required.";
  }

  if (!payload.email) {
    return "Email is required.";
  }

  if (!payload.phone) {
    return "Phone number is required.";
  }

  const passwordFieldsFilled = [
    payload.currentPassword,
    payload.newPassword,
    payload.confirmPassword,
  ].some(Boolean);

  if (passwordFieldsFilled) {
    if (!payload.currentPassword) {
      return "Current password is required.";
    }

    if (!payload.newPassword) {
      return "New password is required.";
    }

    if (String(payload.newPassword).length < 8) {
      return "New password must be at least 8 characters.";
    }

    if (!payload.confirmPassword) {
      return "Confirm password is required.";
    }

    if (payload.newPassword !== payload.confirmPassword) {
      return "New password and confirm password must match.";
    }
  }

  return "";
}

async function savePatientProfile(payload) {
  const attempts = [
    { method: "PUT", path: "/patient/me" },
    { method: "PATCH", path: "/patient/me" },
  ];

  let lastResult = null;

  for (const attempt of attempts) {
    const response = await apiFetch(
      attempt.path,
      {
        method: attempt.method,
        body: JSON.stringify(payload),
      },
    );

    let result = {};
    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (response.status === 404 || response.status === 405) {
      lastResult = { response, result };
      continue;
    }

    return { response, result };
  }

  return lastResult ?? { response: null, result: null };
}

function normalizePatientUser(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,
    patient: user.patient
      ? {
          ...user.patient,
          bloodGroup: user.patient.bloodGroup ?? user.patient.blood_group ?? "",
          dateOfBirth: user.patient.dateOfBirth ?? user.patient.date_of_birth ?? "",
          state: user.patient.state ?? "",
        }
      : null,
  };
}

function syncPatientCache(user) {
  if (typeof window === "undefined") {
    return;
  }

  persistAuthSession("patient", "session", user);
}

function formatDateForInput(value) {
  if (!value) {
    return "";
  }

  const text = String(value);
  if (text.includes("T")) {
    return text.slice(0, 10);
  }

  return text.slice(0, 10);
}

function formatStatus(status) {
  const text = String(status ?? "").trim();

  if (!text) {
    return "Active";
  }

  return text.replace(/_/g, " ").replace(/(^|\s)\w/g, (match) => match.toUpperCase());
}

function formatLocation({ city, state }) {
  return [city, state]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join("/");
}

function splitLocation(value) {
  const parts = String(value ?? "")
    .split("/")
    .map((part) => part.trim())
    .slice(0, 2);

  return {
    city: parts[0] || null,
    state: parts[1] || null,
  };
}

function getInitials(name) {
  const trimmed = String(name ?? "").trim();

  if (!trimmed) {
    return "P";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "P";
  const second = parts[1]?.charAt(0) ?? "";

  return `${first}${second}`.toUpperCase();
}
