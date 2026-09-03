"use client";

import { Link } from "@inertiajs/react";
import { useRouter } from "@/utils/navigation";
import { useSearchParams } from "@/utils/navigation";
import { Suspense, useState } from "react";
import { apiFetch, clearAuthSession } from "@/utils/api";

const initialForm = {
  token: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState(() => ({
    ...initialForm,
    token: searchParams.get("token") ?? "",
    email: searchParams.get("email") ?? "",
  }));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: "" }));
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrors({});
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await apiFetch("/patient/reset-password", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          password_confirmation: form.confirmPassword,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setErrors(result.errors ?? { [result.field ?? "form"]: result.message });
        return;
      }

      clearAuthSession("patient");
      setMessage(result.message ?? "Password has been reset successfully.");
      setTimeout(() => router.push("/login"), 900);
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
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
            Reset Password
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl">
            Choose a new password.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            Reset links expire after 15 minutes and can be used only once.
          </p>
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

          <div className="grid gap-4">
            <input type="hidden" name="token" value={form.token} />
            <Field
              label="Email"
              name="email"
              value={form.email}
              error={errors.email}
              onChange={updateField}
              autoComplete="email"
            />
            <Field
              label="New password"
              name="password"
              type="password"
              value={form.password}
              error={errors.password}
              onChange={updateField}
              autoComplete="new-password"
            />
            <Field
              label="Confirm new password"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              error={errors.confirmPassword}
              onChange={updateField}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Resetting password..." : "Reset password"}
          </button>

          <p className="mt-4 text-center text-sm text-slate-600">
            Need a new link?{" "}
            <Link href="/forgot-password" className="font-semibold text-brand hover:text-brand-hover">
              Request again
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  value,
  error,
  onChange,
  type = "text",
  autoComplete,
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
