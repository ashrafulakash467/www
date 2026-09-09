"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";
import EarningsFilters from "./EarningsFilters";
import EarningsDetails from "./EarningsDetails";

export default function EarningsHistory() {
  const [history, setHistory] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: "", from: "", to: "", search: "", page: 1 });
  const [selectedEarning, setSelectedEarning] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.search) params.set("search", filters.search);
      params.set("page", String(filters.page));
      const response = await apiFetch(`/doctor/earnings/history?${params}`);
      const data = await response.json();
      if (data.success) {
        setHistory(data.data);
        setMeta(data.meta);
      } else {
        setError(data.message || "Failed to load earnings history.");
      }
    } catch (err) {
      setError("An error occurred while loading earnings history.");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  function handleFilterChange(newFilters) {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }

  function handlePageChange(page) {
    setFilters((prev) => ({ ...prev, page }));
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">History</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">Earnings History</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Detailed breakdown of each earning transaction.</p>
      </div>
      <EarningsFilters filters={filters} onFilterChange={handleFilterChange} />
      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {isLoading ? <LoadingState /> : history.length === 0 ? <EmptyState /> : <EarningsTable history={history} onSelect={setSelectedEarning} />}
      {meta && meta.last_page > 1 && <Pagination meta={meta} onPageChange={handlePageChange} />}
      {selectedEarning && <EarningsDetails earningId={selectedEarning.id} onClose={() => setSelectedEarning(null)} />}
    </section>
  );
}

function LoadingState() {
  return (
    <div className="mt-6 space-y-3">
      {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
      No earnings found for the selected filters.
    </div>
  );
}

function EarningsTable({ history, onSelect }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-3">Date</th>
            <th className="px-3 py-3">Appointment</th>
            <th className="px-3 py-3">Patient</th>
            <th className="px-3 py-3 text-right">Gross</th>
            <th className="px-3 py-3 text-right">Doctor %</th>
            <th className="px-3 py-3 text-right">Doctor ৳</th>
            <th className="px-3 py-3 text-right">Admin %</th>
            <th className="px-3 py-3 text-right">Admin ৳</th>
            <th className="px-3 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {history.map((earning) => (
            <tr key={earning.id} className="border-b border-slate-100 transition hover:bg-slate-50 cursor-pointer" onClick={() => onSelect(earning)}>
              <td className="px-3 py-3 text-slate-700">{formatDate(earning.date)}</td>
              <td className="px-3 py-3 text-slate-700">{earning.appointment?.appointment_no || "-"}</td>
              <td className="px-3 py-3 text-slate-700">{earning.patient?.name || "-"}</td>
              <td className="px-3 py-3 text-right text-slate-700">৳{formatAmount(earning.gross_amount)}</td>
              <td className="px-3 py-3 text-right text-slate-700">{earning.doctor_percentage}%</td>
              <td className="px-3 py-3 text-right font-semibold text-emerald-700">৳{formatAmount(earning.doctor_amount)}</td>
              <td className="px-3 py-3 text-right text-slate-700">{earning.admin_percentage}%</td>
              <td className="px-3 py-3 text-right text-slate-700">৳{formatAmount(earning.admin_amount)}</td>
              <td className="px-3 py-3"><StatusBadge status={earning.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ meta, onPageChange }) {
  return (
    <div className="mt-5 flex items-center justify-between">
      <p className="text-xs text-slate-500">Page {meta.current_page} of {meta.last_page}</p>
      <div className="flex gap-2">
        <button type="button" disabled={meta.current_page <= 1} onClick={() => onPageChange(meta.current_page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Previous</button>
        <button type="button" disabled={meta.current_page >= meta.last_page} onClick={() => onPageChange(meta.current_page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const tones = { released: "bg-emerald-50 text-emerald-700", pending: "bg-amber-50 text-amber-700", refunded: "bg-red-50 text-red-700", reversed: "bg-orange-50 text-orange-700" };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[status] || "bg-slate-50 text-slate-600"}`}>{status ? status.charAt(0).toUpperCase() + status.slice(1) : "-"}</span>;
}

function formatDate(dateString) {
  if (!dateString) return "-";
  try { return new Date(dateString).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return "-"; }
}

function formatAmount(value) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

