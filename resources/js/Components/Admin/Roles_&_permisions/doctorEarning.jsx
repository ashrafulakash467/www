"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";

export default function DoctorEarning() {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [defaultForm, setDefaultForm] = useState({ doctor_percentage: "", admin_percentage: "" });
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [doctorForm, setDoctorForm] = useState({ doctor_percentage: "", admin_percentage: "", effective_from: "" });

  const loadConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiFetch("/admin/commission");
      const data = await response.json();
      if (data.success) {
        setConfig(data.data);
        setDefaultForm({
          doctor_percentage: String(data.data.default_doctor_percentage),
          admin_percentage: String(data.data.default_admin_percentage),
        });
      } else {
        setError(data.message || "Failed to load commission configuration.");
      }
    } catch (err) {
      setError("An error occurred while loading configuration.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  async function handleUpdateDefaults(e) {
    e.preventDefault();
    setMessage(null);
    const doctorP = parseFloat(defaultForm.doctor_percentage);
    const adminP = parseFloat(defaultForm.admin_percentage);
    if (Math.abs((doctorP + adminP) - 100) > 0.01) {
      setMessage({ type: "error", text: "Doctor % + Admin % must equal 100%." });
      return;
    }
    try {
      const response = await apiFetch("/admin/commission/defaults", {
        method: "PUT",
        body: JSON.stringify({ doctor_percentage: doctorP, admin_percentage: adminP }),
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: "success", text: "Default percentages updated successfully." });
        loadConfig();
      } else {
        setMessage({ type: "error", text: data.message || data.errors?.admin_percentage?.[0] || "Update failed." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "An error occurred." });
    }
  }

  async function handleUpdateDoctor(e) {
    e.preventDefault();
    setMessage(null);
    const doctorP = parseFloat(doctorForm.doctor_percentage);
    const adminP = parseFloat(doctorForm.admin_percentage);
    if (Math.abs((doctorP + adminP) - 100) > 0.01) {
      setMessage({ type: "error", text: "Doctor % + Admin % must equal 100%." });
      return;
    }
    try {
      const body = { doctor_percentage: doctorP, admin_percentage: adminP };
      if (doctorForm.effective_from) body.effective_from = doctorForm.effective_from;
      const response = await apiFetch(`/admin/commission/doctors/${editingDoctor.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: "success", text: "Doctor percentage updated successfully." });
        setEditingDoctor(null);
        loadConfig();
      } else {
        setMessage({ type: "error", text: data.message || data.errors?.admin_percentage?.[0] || "Update failed." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "An error occurred." });
    }
  }

  async function handleRemoveDoctor(doctorId) {
    if (!confirm("Remove custom percentage for this doctor? Default will be used.")) return;
    try {
      const response = await apiFetch(`/admin/commission/doctors/${doctorId}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: "success", text: "Doctor custom percentage removed." });
        loadConfig();
      } else {
        setMessage({ type: "error", text: data.message || "Failed to remove." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "An error occurred." });
    }
  }

  function startEdit(doctor) {
    setEditingDoctor(doctor);
    setDoctorForm({
      doctor_percentage: String(doctor.custom_percentage || config?.default_doctor_percentage || 80),
      admin_percentage: String(doctor.custom_percentage ? (100 - doctor.custom_percentage) : config?.default_admin_percentage || 20),
      effective_from: doctor.effective_from || "",
    });
  }

  if (isLoading) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {message.text}
        </div>
      )}
      <DefaultsForm config={config} form={defaultForm} setForm={setDefaultForm} onSubmit={handleUpdateDefaults} />
      <DoctorList config={config} error={error} onEdit={startEdit} onRemove={handleRemoveDoctor} />
      {editingDoctor && (
        <EditDoctorModal
          doctor={editingDoctor}
          form={doctorForm}
          setForm={setDoctorForm}
          onSubmit={handleUpdateDoctor}
          onClose={() => setEditingDoctor(null)}
        />
      )}
    </section>
  );
}

function DefaultsForm({ config, form, setForm, onSubmit }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Commission</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-950">Default Commission Settings</h2>
      <p className="mt-2 text-sm text-slate-500">Set the default doctor and admin commission percentages.</p>
      <form onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Doctor %</label>
          <input type="number" min="0" max="100" step="0.01" value={form.doctor_percentage} onChange={(e) => setForm((f) => ({ ...f, doctor_percentage: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Admin %</label>
          <input type="number" min="0" max="100" step="0.01" value={form.admin_percentage} onChange={(e) => setForm((f) => ({ ...f, admin_percentage: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        </div>
        <div className="flex items-end">
          <button type="submit" className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">Save Defaults</button>
        </div>
      </form>
      {config && <p className="mt-3 text-xs text-slate-500">Current: Doctor {config.default_doctor_percentage}% / Admin {config.default_admin_percentage}%</p>}
    </div>
  );
}

function DoctorList({ config, error, onEdit, onRemove }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Per-Doctor</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-950">Individual Doctor Percentages</h2>
      <p className="mt-2 text-sm text-slate-500">Override commission for specific doctors.</p>
      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Doctor</th>
              <th className="px-3 py-3">Specialty</th>
              <th className="px-3 py-3 text-right">Custom %</th>
              <th className="px-3 py-3 text-right">Effective %</th>
              <th className="px-3 py-3">Effective From</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {config?.doctors?.map((doctor) => (
              <tr key={doctor.id} className="border-b border-slate-100">
                <td className="px-3 py-3 font-medium text-slate-800">{doctor.name}</td>
                <td className="px-3 py-3 text-slate-600">{doctor.specialty}</td>
                <td className="px-3 py-3 text-right text-slate-700">{doctor.custom_percentage !== null ? `${doctor.custom_percentage}%` : <span className="text-slate-400">Default</span>}</td>
                <td className="px-3 py-3 text-right font-semibold text-emerald-700">{doctor.effective_percentage}%</td>
                <td className="px-3 py-3 text-slate-600">{doctor.effective_from || "-"}</td>
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onEdit(doctor)} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50">Edit</button>
                    {doctor.custom_percentage !== null && (
                      <button type="button" onClick={() => onRemove(doctor.id)} className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50">Remove</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditDoctorModal({ doctor, form, setForm, onSubmit, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Edit Doctor Commission</h3>
        <p className="mt-1 text-sm text-slate-500">{doctor.name}</p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Doctor %</label>
            <input type="number" min="0" max="100" step="0.01" value={form.doctor_percentage} onChange={(e) => setForm((f) => ({ ...f, doctor_percentage: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Admin %</label>
            <input type="number" min="0" max="100" step="0.01" value={form.admin_percentage} onChange={(e) => setForm((f) => ({ ...f, admin_percentage: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Effective From</label>
            <input type="date" value={form.effective_from} onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Cancel</button>
            <button type="submit" className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}


