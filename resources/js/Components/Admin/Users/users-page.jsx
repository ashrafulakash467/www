"use client";

import Image from "@/Components/Image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DOCTOR_IMAGE_FALLBACK, resolveDoctorImageSrc } from "@/Components/shared/DoctorCard";
import { apiFetch, getStoredToken } from "@/utils/api";
import {
  createDoctorDirectoryChannel,
  getDoctorDirectoryUpdateEventName,
  notifyDoctorDirectoryUpdated,
} from "@/utils/doctor-directory";
import UpdateUserPage from "./update-user-page";

const categoryOptions = [
  { value: "all", label: "All Users" },
  { value: "doctor", label: "Doctors" },
  { value: "patient", label: "Patients" },
  { value: "admin", label: "Admins" },
];

const USER_IMAGE_FALLBACK = "/images/male-doctor-smiling-happy-face-260nw-2481032615.jpg";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userCategory, setUserCategory] = useState("all");
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);

  const loadUsers = useCallback(async () => {
    const token = getStoredToken("admin");

    if (!token) {
      setError("Admin session not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiFetch("/admin/users", {}, token);
      const result = await response.json();

      if (response.ok) {
        setUsers(Array.isArray(result.users) ? result.users : []);
        setSelectedUserId(null);
        setUserCategory("all");
      } else {
        setError(result.message ?? "Failed to load users.");
      }
    } catch {
      setError("Failed to load users from the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  useEffect(() => {
    const handleDirectoryUpdate = () => {
      void loadUsers();
    };

    const channel = createDoctorDirectoryChannel();

    if (channel) {
      channel.addEventListener("message", handleDirectoryUpdate);
    }

    window.addEventListener(getDoctorDirectoryUpdateEventName(), handleDirectoryUpdate);

    return () => {
      if (channel) {
        channel.removeEventListener("message", handleDirectoryUpdate);
        channel.close();
      }

      window.removeEventListener(getDoctorDirectoryUpdateEventName(), handleDirectoryUpdate);
    };
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => matchesCategory(user, userCategory));
  }, [userCategory, users]);

  const totalUsers = users.length;
  const visibleUsers = filteredUsers.length;

  function openEditUser(user) {
    setSelectedUserId(null);
    setEditingUser(user);
    setEditForm(buildUserForm(user));
  }

  function cancelEdit() {
    setEditingUser(null);
    setEditForm({});
  }

  function openDeleteConfirm(user) {
    setDeleteConfirmUser(user);
  }

  function cancelDelete() {
    setDeleteConfirmUser(null);
  }

  async function handleDeleteUser() {
    if (!deleteConfirmUser?.id) {
      return;
    }

    const token = getStoredToken("admin");
    if (!token) {
      return;
    }

    const userId = deleteConfirmUser.id;

    try {
      const response = await apiFetch(`/admin/users/${userId}`, { method: "DELETE" }, token);

      if (response.ok) {
        setUsers((current) => current.filter((user) => user.id !== userId));

        if (selectedUserId === userId) {
          setSelectedUserId(null);
        }

        if (editingUser?.id === userId) {
          setEditingUser(null);
          setEditForm({});
        }

        setDeleteConfirmUser(null);
        const deletedDoctor = deleteConfirmUser?.doctor ?? null;
        if (deleteConfirmUser?.role === "doctor" || deleteConfirmUser?.roles?.includes?.("doctor") || deletedDoctor) {
          notifyDoctorDirectoryUpdated({
            action: "deleted",
            doctor: deletedDoctor ? { ...deletedDoctor, id: deletedDoctor.id ?? deleteConfirmUser.id } : { id: deleteConfirmUser.id },
          });
        }
        await loadUsers();
      }
    } catch {
      // Keep the page stable if delete fails.
    }
  }

  async function handleSaveUser(userId, formData) {
    const token = getStoredToken("admin");
    if (!token) {
      return;
    }

    const isCreateMode = !userId;
    const passwordValue = String(formData?.password ?? "").trim();
    const passwordConfirmationValue = String(formData?.passwordConfirmation ?? "").trim();
    const roles = parseRoleList(formData?.rolesText ?? formData?.role ?? "user");
    const primaryRole = String(formData?.role ?? roles[0] ?? "user").trim().toLowerCase() || "user";

    if (passwordValue || passwordConfirmationValue) {
      if (!passwordValue || !passwordConfirmationValue) {
        return;
      }

      if (passwordValue !== passwordConfirmationValue) {
        return;
      }
    }

    const payload = {
      name: String(formData?.name ?? "").trim(),
      email: String(formData?.email ?? "").trim(),
      phone: String(formData?.phone ?? "").trim(),
      status: String(formData?.status ?? "active").trim().toLowerCase() || "active",
      role: primaryRole,
      roles,
      two_factor_enabled: String(formData?.twoFactorEnabled ?? "").toLowerCase() === "enabled",
      password: passwordValue || undefined,
      password_confirmation: passwordValue ? passwordConfirmationValue : undefined,
    };

    const doctorSpecialty = String(formData?.doctorSpecialty ?? "").trim();
    const doctorLicenseNo = String(formData?.doctorLicenseNo ?? "").trim();
    const doctorGender = String(formData?.doctorGender ?? "").trim();
    const doctorVerificationStatus = String(formData?.doctorVerificationStatus ?? "").trim();
    const patientMrn = String(formData?.patientMrn ?? "").trim();
    const patientGender = String(formData?.patientGender ?? "").trim();
    const patientBloodGroup = String(formData?.patientBloodGroup ?? "").trim();
    const patientDateOfBirth = String(formData?.patientDateOfBirth ?? "").trim();
    const patientCity = String(formData?.patientCity ?? "").trim();

    if (doctorSpecialty) payload.doctor_specialty = doctorSpecialty;
    if (doctorLicenseNo) payload.doctor_license_no = doctorLicenseNo;
    if (doctorGender) payload.doctor_gender = doctorGender;
    if (doctorVerificationStatus) payload.doctor_verification_status = doctorVerificationStatus;
    if (patientMrn) payload.patient_mrn = patientMrn;
    if (patientGender) payload.patient_gender = patientGender;
    if (patientBloodGroup) payload.patient_blood_group = patientBloodGroup;
    if (patientDateOfBirth) payload.patient_date_of_birth = patientDateOfBirth;
    if (patientCity) payload.patient_city = patientCity;

    try {
      const response = await apiFetch(
        isCreateMode ? "/admin/users" : `/admin/users/${userId}`,
        {
          method: isCreateMode ? "POST" : "PUT",
          body: JSON.stringify(payload),
        },
        token,
      );
      const result = await response.json();

      if (response.ok) {
        const nextUser = result.user ?? result.data ?? result.profile ?? null;

        if (nextUser) {
          setUsers((current) =>
            isCreateMode
              ? [nextUser, ...current]
              : current.map((user) => (user.id === userId ? nextUser : user)),
          );
          setSelectedUserId(nextUser.id ?? userId ?? null);

          const nextDoctor = nextUser.doctor ?? null;
          const hasDoctorRole =
            String(nextUser.role ?? "").toLowerCase() === "doctor" ||
            (Array.isArray(nextUser.roles) && nextUser.roles.some((role) => String(role).toLowerCase() === "doctor")) ||
            Boolean(nextDoctor);

          if (hasDoctorRole) {
            notifyDoctorDirectoryUpdated({
              action: isCreateMode ? "created" : "updated",
              doctor: nextDoctor ? { ...nextDoctor, id: nextDoctor.id ?? nextUser.doctor?.id } : { id: nextUser.id ?? userId },
            });
          }
        }

        setEditingUser(null);
        setEditForm({});
        await loadUsers();
      }
    } catch {
      // Keep the page stable if the update fails.
    }
  }

  if (loading) {
    return (
      <PanelCard
        eyebrow="User Management"
        title="Users"
        description="Loading user cards from the database..."
      >
        <div className="flex items-center justify-center py-16 text-sm font-medium text-slate-500">
          Loading users...
        </div>
      </PanelCard>
    );
  }

  if (error) {
    return (
      <PanelCard
        eyebrow="User Management"
        title="Users"
        description="User cards could not be loaded."
      >
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-14 text-center">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      eyebrow="User Management"
      title="Users"
      description=""
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Total Users
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{totalUsers}</p>
            <p className="mt-1 text-sm text-slate-500">
              Showing {visibleUsers} user{visibleUsers === 1 ? "" : "s"} in this category.
            </p>
          </div>

          <label className="w-full lg:w-72">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              User Category
            </span>
            <select
              value={userCategory}
              onChange={(event) => {
                setUserCategory(event.target.value);
                setSelectedUserId(null);
              }}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400"
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {editingUser ? (
          <UpdateUserPage
            key={editingUser.id ?? "new-user"}
            user={editingUser}
            form={editForm}
            setForm={setEditForm}
            onSave={() => handleSaveUser(editingUser.id, editForm)}
            onCancel={cancelEdit}
          />
        ) : (
          <>
            {filteredUsers.length ? (
              <div className="grid grid-cols-1 gap-3">
                {filteredUsers.map((user) => {
                  const isSelected = user.id === selectedUserId;
                  const primaryRole = formatRoleLabel(getPrimaryRole(user));
                  const userInitial = getUserInitial(user.name);
                  const avatarSrc = resolveUserImageSrc(user);
                  const showAvatarFallback = avatarSrc === USER_IMAGE_FALLBACK;

                  return (
                    <div
                      key={user.id}
                      className={`w-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md ${
                        isSelected
                          ? "border-slate-950 bg-slate-950 text-white shadow-lg"
                          : "border-slate-200 bg-white text-slate-900"
                      }`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-blue-50">
                            <Image
                              key={avatarSrc}
                              src={avatarSrc}
                              alt={user.name ?? "User"}
                              fill
                              className="object-cover"
                              sizes="44px"
                              unoptimized
                            />
                            {showAvatarFallback ? (
                              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold text-blue-600">
                                {userInitial}
                              </span>
                            ) : null}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3
                                className={`truncate text-sm font-bold ${
                                  isSelected ? "text-white" : "text-slate-900"
                                }`}
                              >
                                {user.name ?? "Unnamed User"}
                              </h3>
                              <Badge tone={user.status} className="hidden sm:inline-flex">
                                {formatStatusLabel(user.status)}
                              </Badge>
                            </div>

                            <div
                              className={`mt-0.5 flex min-w-0 items-center gap-1.5 text-xs ${
                                isSelected ? "text-white/70" : "text-slate-500"
                              }`}
                            >
                              <MailIcon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{user.email ?? "N/A"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="min-w-[130px]">
                          <p className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected ? "text-white/50" : "text-slate-400"}`}>
                            Role
                          </p>
                          <p className={`mt-0.5 text-sm font-medium ${isSelected ? "text-white/90" : "text-slate-700"}`}>
                            {primaryRole}
                          </p>
                        </div>

                        <div className="min-w-[110px]">
                          <p className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected ? "text-white/50" : "text-slate-400"}`}>
                            Joined
                          </p>
                          <p className={`mt-0.5 text-sm font-bold ${isSelected ? "text-emerald-300" : "text-emerald-600"}`}>
                            {formatShortDate(user.createdAt)}
                          </p>
                        </div>

                        <div className="hidden min-w-[190px] xl:block">
                          <div className={`flex items-center gap-1.5 text-xs ${isSelected ? "text-white/80" : "text-slate-600"}`}>
                            <PhoneIcon className="h-3.5 w-3.5 text-slate-400" />
                            <span>{user.phone ?? "N/A"}</span>
                          </div>

                          <div className={`mt-1 flex items-center gap-1.5 text-xs ${isSelected ? "text-white/70" : "text-slate-500"}`}>
                            <CheckCircleIcon className={`h-3.5 w-3.5 ${badgeToneIcon(user.status)}`} />
                            <span className={`font-medium ${badgeToneText(user.status)}`}>
                              {formatStatusLabel(user.status)}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1 border-t border-slate-100 pt-3 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
                          <button
                            type="button"
                            title={isSelected ? "Hide Details" : "View Details"}
                            onClick={() => setSelectedUserId(isSelected ? null : user.id)}
                            className={`inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs font-semibold transition ${
                              isSelected
                                ? "border-black bg-white text-black hover:bg-slate-100"
                                : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            <EyeIcon className="h-4 w-4" />
                            <span>{isSelected ? "Hide" : "View"}</span>
                          </button>

                          <button
                            type="button"
                            title="Edit User"
                            onClick={() => openEditUser(user)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 transition hover:bg-blue-100"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            title="Delete User"
                            onClick={() => openDeleteConfirm(user)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500 lg:hidden">
                        <div className="flex items-center gap-1.5">
                          <PhoneIcon className="h-3.5 w-3.5 text-slate-400" />
                          <span>{user.phone ?? "N/A"}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatShortDate(user.createdAt)}</span>
                        </div>

                        <div className="ml-auto flex items-center gap-1.5">
                          <CheckCircleIcon className={`h-3.5 w-3.5 ${badgeToneIcon(user.status)}`} />
                          <span className={`font-medium ${badgeToneText(user.status)}`}>
                            {formatStatusLabel(user.status)}
                          </span>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
                                Selected User
                              </p>
                              <h3 className="mt-2 text-xl font-bold text-black">
                                {user.name ?? "Unnamed User"}
                              </h3>
                              <p className="mt-1 text-sm text-black/70">{user.email ?? "N/A"}</p>
                            </div>

                            <Badge tone={user.status} selected>
                              {formatStatusLabel(user.status)}
                            </Badge>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {getUserRoles(user).length ? (
                              getUserRoles(user).map((role) => (
                                <Tag key={role} selected>
                                  {formatRoleLabel(role)}
                                </Tag>
                              ))
                            ) : (
                              <Tag selected>User</Tag>
                            )}
                            <Tag selected>{user.twoFactorEnabled ? "2FA Enabled" : "2FA Disabled"}</Tag>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <InfoPair label="Phone" value={user.phone ?? "N/A"} />
                            <InfoPair label="Created" value={formatLongDate(user.createdAt)} />
                            <InfoPair label="Last Login" value={formatLongDate(user.lastLoginAt)} />
                            <InfoPair label="Status" value={formatStatusLabel(user.status)} />
                          </div>

                          {user.doctor ? (
                            <DetailSection title="Doctor Profile">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <InfoPair label="Specialty" value={user.doctor.specialty ?? "N/A"} />
                                <InfoPair label="License" value={user.doctor.licenseNo ?? "N/A"} />
                                <InfoPair label="Gender" value={user.doctor.gender ?? "N/A"} />
                                <InfoPair
                                  label="Verification"
                                  value={formatStatusLabel(user.doctor.verificationStatus ?? "N/A")}
                                />
                              </div>
                            </DetailSection>
                          ) : null}

                          {user.patient ? (
                            <DetailSection title="Patient Profile">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <InfoPair label="MRN" value={user.patient.mrn ?? "N/A"} />
                                <InfoPair label="Gender" value={user.patient.gender ?? "N/A"} />
                                <InfoPair label="Blood Group" value={user.patient.bloodGroup ?? "N/A"} />
                                <InfoPair label="Date of Birth" value={user.patient.dateOfBirth ?? "N/A"} />
                              </div>
                              <InfoPair label="City" value={user.patient.city ?? "N/A"} />
                            </DetailSection>
                          ) : null}

                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center text-sm font-medium text-slate-500">
                No users found.
              </div>
            )}
          </>
        )}
      </div>

      {deleteConfirmUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.24)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Confirm Delete
            </p>
            <h3 className="mt-2 text-lg font-bold text-slate-950">
              Delete {deleteConfirmUser.name ?? "this user"}?
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This action cannot be undone. The user record will be removed from the list.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelDelete}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteUser()}
                className="rounded-xl border border-rose-600 bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PanelCard>
  );
}

function PanelCard({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function InfoPair({ label, value }) {
  return (
    <div className="rounded-xl border border-black bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-black/50">{label}</p>
      <p className="mt-1 text-sm font-semibold text-black">{value}</p>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black">{title}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Tag({ children, selected = false }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        selected ? "border-black bg-white text-black" : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {children}
    </span>
  );
}

function Badge({ children, tone, selected = false, className = "" }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
        selected ? badgeToneOnDark(tone) : badgeTone(tone)
      } ${className}`}
    >
      {children}
    </span>
  );
}

function badgeTone(tone) {
  const text = String(tone ?? "").toLowerCase();

  if (text === "active" || text === "approved") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (text.includes("pending")) {
    return "bg-amber-100 text-amber-700";
  }

  if (text.includes("suspend") || text.includes("inactive") || text.includes("deleted")) {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-slate-100 text-slate-700";
}

function badgeToneOnDark() {
  return "bg-white text-black";
}

function normalizeRoleNames(roles) {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles
    .map((role) => String(role ?? "").trim().toLowerCase())
    .filter(Boolean);
}

function getUserRoles(user) {
  const roles = normalizeRoleNames(user?.roles);

  if (roles.length) {
    return roles;
  }

  const primaryRole = String(user?.role ?? "").trim().toLowerCase();
  return primaryRole ? [primaryRole] : [];
}

function getPrimaryRole(user) {
  const roleNames = getUserRoles(user);
  const primaryRole = String(user?.role ?? "user").trim().toLowerCase();

  return roleNames[0] ?? primaryRole ?? "user";
}

function matchesCategory(user, category) {
  const roles = getUserRoles(user);
  const roleSet = new Set(roles);

  if (category === "all") {
    return true;
  }

  return roleSet.has(category);
}

function buildUserForm(user) {
  const roleNames = getUserRoles(user);
  const primaryRole = roleNames[0] ?? String(user?.role ?? "user").trim().toLowerCase();
  const normalizedPrimaryRole = primaryRole || "user";

  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    status: String(user?.status ?? "active").trim().toLowerCase() || "active",
    role: normalizedPrimaryRole,
    rolesText: roleNames.length ? roleNames.join(", ") : normalizedPrimaryRole,
    twoFactorEnabled: user?.twoFactorEnabled ? "enabled" : "disabled",
    password: "",
    passwordConfirmation: "",
    doctorSpecialty: user?.doctor?.specialty ?? "",
    doctorLicenseNo: user?.doctor?.licenseNo ?? "",
    doctorGender: String(user?.doctor?.gender ?? "").trim().toLowerCase(),
    doctorVerificationStatus: String(user?.doctor?.verificationStatus ?? "").trim().toLowerCase(),
    patientMrn: user?.patient?.mrn ?? "",
    patientGender: String(user?.patient?.gender ?? "").trim().toLowerCase(),
    patientBloodGroup: String(user?.patient?.bloodGroup ?? "").trim().toLowerCase(),
    patientDateOfBirth: user?.patient?.dateOfBirth ?? "",
    patientCity: user?.patient?.city ?? "",
  };
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

function badgeToneIcon(status) {
  const text = String(status ?? "").toLowerCase();

  if (text === "active" || text === "approved") {
    return "text-emerald-500";
  }

  if (text.includes("pending")) {
    return "text-amber-500";
  }

  if (text.includes("suspend") || text.includes("inactive") || text.includes("deleted")) {
    return "text-rose-500";
  }

  return "text-slate-400";
}

function badgeToneText(status) {
  const text = String(status ?? "").toLowerCase();

  if (text === "active" || text === "approved") {
    return "text-emerald-700";
  }

  if (text.includes("pending")) {
    return "text-amber-700";
  }

  if (text.includes("suspend") || text.includes("inactive") || text.includes("deleted")) {
    return "text-rose-700";
  }

  return "text-slate-600";
}

function getUserInitial(name) {
  const trimmed = String(name ?? "").trim();

  if (!trimmed) {
    return "U";
  }

  return trimmed.split(/\s+/)[0].charAt(0).toUpperCase() || "U";
}

function resolveUserImageSrc(user) {
  const resolvedImage = resolveDoctorImageSrc(user?.doctor ?? user);

  return resolvedImage === DOCTOR_IMAGE_FALLBACK ? USER_IMAGE_FALLBACK : resolvedImage;
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
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V4h6v3" />
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

function PhoneIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M5 4.5c0-.8.6-1.5 1.4-1.5h2.1c.7 0 1.3.5 1.4 1.2l.5 2.7c.1.7-.2 1.3-.8 1.7l-1.4.9c1 2 2.6 3.6 4.6 4.6l.9-1.4c.4-.6 1-.9 1.7-.8l2.7.5c.7.1 1.2.7 1.2 1.4v2.1c0 .8-.7 1.4-1.5 1.4C10.6 20 4 13.4 4 5.5Z" />
    </SvgIcon>
  );
}

function CalendarIcon(props) {
  return (
    <SvgIcon {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M7 3.5V7" />
      <path d="M17 3.5V7" />
      <path d="M3.5 9.5h17" />
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

function formatShortDate(value) {
  if (!value) {
    return "No date available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
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
