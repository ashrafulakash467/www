"use client";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
  { value: "pending", label: "Pending" },
];

const roleOptions = [
  { value: "user", label: "User" },
  { value: "patient", label: "Patient" },
  { value: "doctor", label: "Doctor" },
  { value: "admin", label: "Admin" },
  { value: "support", label: "Support" },
  { value: "super-admin", label: "Super Admin" },
];

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const bloodGroupOptions = [
  { value: "a+", label: "A+" },
  { value: "a-", label: "A-" },
  { value: "b+", label: "B+" },
  { value: "b-", label: "B-" },
  { value: "ab+", label: "AB+" },
  { value: "ab-", label: "AB-" },
  { value: "o+", label: "O+" },
  { value: "o-", label: "O-" },
];

const verificationStatusOptions = [
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
  { value: "unavailable", label: "Unavailable" },
];

export default function UpdateUserPage({ user, form, setForm, onSave, onCancel }) {
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

  const roleNames = parseRoleList(currentValue("rolesText", user.roles ?? user.role ?? "user"));
  const primaryRole = String(currentValue("role", user.role ?? roleNames[0] ?? "user"))
    .trim()
    .toLowerCase() || "user";
  const selectedStatus = String(currentValue("status", user.status ?? "active")).trim().toLowerCase() || "active";
  const isDoctorRole = roleNames.includes("doctor") || primaryRole === "doctor" || Boolean(user?.doctor);
  const isPatientRole = roleNames.includes("patient") || primaryRole === "patient" || Boolean(user?.patient);

  const passwordLabel = user?.id ? "New Password" : "Password";
  const passwordConfirmLabel = user?.id ? "Confirm New Password" : "Confirm Password";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 pb-28 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {user?.id ? "Edit User" : "Add New User"}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">
            {user?.id ? user.name ?? "Unnamed User" : "Create a new user"}
          </h3>
        </div>

        <Badge tone={badgeTone(selectedStatus)}>{formatStatusLabel(selectedStatus)}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Name"
          value={currentValue("name", user.name)}
          onChange={(value) => updateField("name", value)}
          placeholder="User name"
        />
        <Field
          label="Email"
          value={currentValue("email", user.email)}
          onChange={(value) => updateField("email", value)}
          placeholder="user@example.com"
          type="email"
        />
        <Field
          label="Phone"
          value={currentValue("phone", user.phone)}
          onChange={(value) => updateField("phone", value)}
          placeholder="01700000000"
        />
        <SelectField
          label="Status"
          value={selectedStatus}
          onChange={(value) => updateField("status", value)}
          options={statusOptions}
        />
        <SelectField
          label="Primary Role"
          value={primaryRole}
          onChange={(value) => updateField("role", value)}
          options={roleOptions}
        />
        <Field
          label="Roles"
          value={currentValue("rolesText", roleNames.join(", "))}
          onChange={(value) => updateField("rolesText", value)}
          placeholder="doctor, patient"
        />
        <SelectField
          label="2FA"
          value={currentValue("twoFactorEnabled", user.twoFactorEnabled ? "enabled" : "disabled")}
          onChange={(value) => updateField("twoFactorEnabled", value)}
          options={[
            { value: "enabled", label: "Enabled" },
            { value: "disabled", label: "Disabled" },
          ]}
        />
        <div className="md:col-span-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          {user?.id
            ? "Leave the password fields blank to keep the current user login. Fill both fields to update it."
            : "Set both password fields before saving so the new account can sign in immediately."}
        </div>
        <Field
          label={passwordLabel}
          value={currentValue("password", "")}
          onChange={(value) => updateField("password", value)}
          placeholder={user?.id ? "Leave blank to keep current password" : "Set a login password"}
          type="password"
        />
        <Field
          label={passwordConfirmLabel}
          value={currentValue("passwordConfirmation", "")}
          onChange={(value) => updateField("passwordConfirmation", value)}
          placeholder="Re-enter password"
          type="password"
        />

        <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Role-aware details
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Update doctor or patient profile fields only when the user actually belongs to that role.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {roleNames.length ? (
                roleNames.map((role) => (
                  <Tag key={role}>{formatRoleLabel(role)}</Tag>
                ))
              ) : (
                <Tag>User</Tag>
              )}
            </div>
          </div>

          {isDoctorRole ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field
                label="Doctor Specialty"
                value={currentValue("doctorSpecialty", user.doctor?.specialty ?? "")}
                onChange={(value) => updateField("doctorSpecialty", value)}
                placeholder="Cardiology"
              />
              <Field
                label="Doctor License No"
                value={currentValue("doctorLicenseNo", user.doctor?.licenseNo ?? "")}
                onChange={(value) => updateField("doctorLicenseNo", value)}
                placeholder="BMDC-123456"
              />
              <SelectField
                label="Doctor Gender"
                value={currentValue("doctorGender", String(user.doctor?.gender ?? "").trim().toLowerCase())}
                onChange={(value) => updateField("doctorGender", value)}
                options={genderOptions}
              />
              <SelectField
                label="Verification Status"
                value={currentValue(
                  "doctorVerificationStatus",
                  String(user.doctor?.verificationStatus ?? "pending").trim().toLowerCase(),
                )}
                onChange={(value) => updateField("doctorVerificationStatus", value)}
                options={verificationStatusOptions}
              />
            </div>
          ) : null}

          {isPatientRole ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field
                label="MRN"
                value={currentValue("patientMrn", user.patient?.mrn ?? "")}
                onChange={(value) => updateField("patientMrn", value)}
                placeholder="MRN-0001"
              />
              <Field
                label="City"
                value={currentValue("patientCity", user.patient?.city ?? "")}
                onChange={(value) => updateField("patientCity", value)}
                placeholder="Dhaka"
              />
              <SelectField
                label="Patient Gender"
                value={currentValue("patientGender", String(user.patient?.gender ?? "").trim().toLowerCase())}
                onChange={(value) => updateField("patientGender", value)}
                options={genderOptions}
              />
              <SelectField
                label="Blood Group"
                value={currentValue(
                  "patientBloodGroup",
                  String(user.patient?.bloodGroup ?? "").trim().toLowerCase(),
                )}
                onChange={(value) => updateField("patientBloodGroup", value)}
                options={bloodGroupOptions}
              />
              <Field
                label="Date of Birth"
                value={currentValue("patientDateOfBirth", user.patient?.dateOfBirth ?? "")}
                onChange={(value) => updateField("patientDateOfBirth", value)}
                placeholder="YYYY-MM-DD"
                type="date"
              />
            </div>
          ) : null}

          {!isDoctorRole && !isPatientRole ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Use the roles field to unlock doctor or patient profile inputs when needed.
            </div>
          ) : null}
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 z-40 w-[min(92vw,24rem)] -translate-x-1/2 px-4 py-3">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onSave}
            className="inline-flex min-w-32 items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {user?.id ? "Save Changes" : "Create User"}
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
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
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
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
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

function Tag({ children }) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
      {children}
    </span>
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
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        toneClasses[tone] ?? toneClasses.slate
      }`}
    >
      {children}
    </span>
  );
}

function parseRoleList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim().toLowerCase())
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[\n,]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function formatRoleLabel(role) {
  const text = String(role ?? "").trim().toLowerCase();

  return (
    {
      "super-admin": "Super Admin",
      admin: "Admin",
      doctor: "Doctor",
      patient: "Patient",
      support: "Support",
      user: "User",
    }[text] ?? text.replace(/(^|\s)\w/g, (match) => match.toUpperCase())
  );
}

function formatStatusLabel(status) {
  const text = String(status ?? "").trim();

  if (!text) {
    return "Active";
  }

  return text.replace(/_/g, " ").replace(/(^|\s)\w/g, (match) => match.toUpperCase());
}

function badgeTone(status) {
  const text = String(status ?? "").toLowerCase();

  if (text === "active" || text === "approved") {
    return "emerald";
  }

  if (text.includes("pending")) {
    return "amber";
  }

  if (text.includes("suspend") || text.includes("inactive") || text.includes("deleted")) {
    return "rose";
  }

  return "slate";
}
