"use client";

import { Link } from "@inertiajs/react";
import { useRouter } from "@/utils/navigation";
import { useState } from "react";
import { apiFetch, persistAuthSession } from "@/utils/api";

const ROUTES = {
  user: {
    login: "/login",
    register: "/register",
    registerEndpoint: "/patient/register",
    dashboard: "/patient/dashboard",
  },
  doctor: {
    login: "/doctor/login",
    registerEndpoint: "/doctor/register",
    dashboard: "/doctor/dashboard",
  },
  admin: {
    login: "/login",
  },
};

const UNIFIED_LOGIN_ENDPOINT = "/login";

export default function UnifiedAuthPage({ mode, initialRole = "user" }) {
  const router = useRouter();
  const activeRole = mode === "register" ? "user" : normalizeRole(initialRole);
  const [form, setForm] = useState(() => createInitialForm(mode));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: "" }));
    setMessage("");
  }

  function switchMode(nextMode) {
    const route = ROUTES[activeRole]?.[nextMode];
    if (!route) {
      return;
    }

    router.push(route);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setMessage("");

    if (mode === "login") {
      const payload = buildPayload(mode, form);

      if (!payload.ok) {
        setErrors(payload.errors);
        setIsSubmitting(false);
        return;
      }

      try {
        const response = await apiFetch(UNIFIED_LOGIN_ENDPOINT, {
          method: "POST",
          body: JSON.stringify(payload.body),
        });
        const result = await response.json();

        if (!response.ok) {
          setErrors(result.errors ?? { [result.field ?? "form"]: result.message });
          return;
        }

        const sessionRole = resolveSessionRole(result.user);

        if (!sessionRole) {
          setErrors({
            form: "We could not determine which dashboard to open for this account.",
          });
          return;
        }

        persistAuthSession(sessionRole, result.token, result.user);
        router.push(getDashboardPath(sessionRole));
        return;
      } catch {
        setErrors({
          form: "Could not reach the API. Please check your connection and try again.",
        });
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    const config = ROUTES.user;
    const payload = buildPayload(mode, form);

    if (!payload.ok) {
      setErrors(payload.errors);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await apiFetch(
        config.registerEndpoint,
        { method: "POST", body: JSON.stringify(payload.body) },
      );
      const result = await response.json();

      if (!response.ok) {
        setErrors(result.errors ?? { [result.field ?? "form"]: result.message });
        return;
      }

      if (result.token && result.user) {
        const sessionRole = mode === "register" ? "patient" : resolveSessionRole(result.user) || "patient";
        persistAuthSession(sessionRole, result.token, result.user);
        router.push(config.dashboard);
        return;
      }

      setForm(createInitialForm(mode));
      setMessage(result.message ?? "Account created successfully.");
    } catch {
      setErrors({
        form: "Could not reach the API. Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="bg-white">
      <section className="mx-auto grid min-h-[calc(100vh-220px)] w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
            {mode === "register" ? "Registration" : "Login"}
          </p>
          <h1 className="max-w-xl text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl">
            {mode === "register" ? "Create your account." : "Login Portal"}
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-brand-soft bg-[#f7fbf8] p-5 shadow-[0_18px_50px_rgba(52,92,50,0.10)] sm:p-7"
        >
          {errors.form ? (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errors.form}
            </p>
          ) : null}

          {message ? (
            <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </p>
          ) : null}

          {mode === "login" ? (
            <>
              <div className="grid gap-4">
                <Field
                  label="Email or phone"
                  name="identifier"
                  value={form.identifier}
                  onChange={updateField}
                  autoComplete="username"
                  error={errors.identifier}
                 />
                <Field
                  label="Password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={updateField}
                  autoComplete="current-password"
                  error={errors.password}
                />
              </div>

              {activeRole === "admin" ? (
                <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                 Demo Admin:
                 admin@healthcare.com  pass:Admin@12345
                </p>
              ) : null}
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" name="name" value={form.name} onChange={updateField} autoComplete="name" error={errors.name} />
              <Field label="Email" name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" error={errors.email} />
              <Field label="Phone" name="phone" value={form.phone} onChange={updateField} autoComplete="tel" error={errors.phone} />
              <Field label="Password" name="password" type="password" value={form.password} onChange={updateField} autoComplete="new-password" error={errors.password} />
              <Field label="Confirm password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={updateField} autoComplete="new-password" error={errors.confirmPassword} />
            </div>
          )}

          {mode === "login" ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing in..." : "Log in"}
            </button>
          ) : null}

          {mode === "register" ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? "Creating account..."
                : "Create account"}
            </button>
          ) : null}

          <div className="mt-4 flex flex-col items-center justify-center gap-2 text-sm text-slate-600 sm:flex-row sm:gap-4">
            {mode === "login" ? (
              <>
                <Link href="/forgot-password" className="font-semibold text-brand hover:text-brand-hover">
                  Forgot password?
                </Link>
                <span className="hidden text-slate-300 sm:inline">|</span>
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="font-semibold text-brand hover:text-brand-hover"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                <span className="text-slate-500">
                  Already have an account?
                </span>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="font-semibold text-brand hover:text-brand-hover"
                >
                  Log in
                </button>
              </>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  autoComplete,
  error,
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
      />
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

function createInitialForm(mode) {
  if (mode === "login") {
    return {
      identifier: "",
      password: "",
    };
  }

  return {
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  };
}

function buildPayload(mode, form) {
  if (mode === "login") {
    const errors = {};

    if (!form.identifier?.trim()) {
      errors.identifier = "Email or phone is required.";
    }

    if (!form.password) {
      errors.password = "Password is required.";
    }

    if (Object.keys(errors).length > 0) {
      return { ok: false, errors };
    }

    return {
      ok: true,
      body: {
        identifier: form.identifier,
        password: form.password,
      },
    };
  }

  const errors = {};

  if (!form.name?.trim()) errors.name = "Name is required.";
  if (!form.email?.trim()) errors.email = "Email is required.";
  if (!form.phone?.trim()) errors.phone = "Phone is required.";
  if (!form.password) errors.password = "Password is required.";
  if (form.password !== form.confirmPassword) errors.confirmPassword = "Passwords do not match.";

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    body: {
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      confirmPassword: form.confirmPassword,
    },
  };
}

function normalizeRole(value) {
  if (Array.isArray(value)) {
    return normalizeRole(value[0]);
  }

  return ["user", "doctor", "admin"].includes(value) ? value : "user";
}

function resolveSessionRole(user) {
  const primaryRole = normalizeSessionRole(user?.role);

  if (primaryRole) {
    return primaryRole;
  }

  const roles = Array.isArray(user?.roles) ? user.roles : [];

  for (const candidate of roles) {
    const normalized = normalizeSessionRole(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function normalizeSessionRole(value) {
  const role = String(value ?? "").trim().toLowerCase();

  if (role === "user" || role === "patient") {
    return "patient";
  }

  if (role === "doctor" || role === "admin") {
    return role;
  }

  return "";
}

function getDashboardPath(role) {
  if (role === "doctor") {
    return "/doctor/dashboard";
  }

  if (role === "admin") {
    return "/admin/dashboard";
  }

  return "/patient/dashboard";
}
