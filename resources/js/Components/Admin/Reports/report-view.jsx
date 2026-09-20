"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/utils/api";

export default function ReportView({ reportKey, title, description, stats: initialStats, columns, filters = [], onBack }) {
  filters = filters.filter((filter) => filter.key !== "period");
  const endpointKey = reportKey ?? {
    "Appointment Report": "appointments",
    "Doctor Report": "doctors",
    "Patient Report": "patients",
    "Payment Report": "payments",
    "Refund Report": "refunds",
    "Earnings & Commission Report": "earnings",
    "Medical Record Report": "medical-records",
    "System Activity / Audit Report": "audit",
    "Support Report": "support",
    "Date-wise Summary Report": "date-summary",
  }[title];
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [selectedFilters, setSelectedFilters] = useState({});
  const [stats, setStats] = useState(initialStats);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const queryParams = useMemo(() => {
    const params = new URLSearchParams({ period, page: String(page), per_page: String(perPage) });
    if (search.trim()) params.set("search", search.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    Object.entries(selectedFilters).forEach(([key, value]) => { if (value) params.set(key, value); });
    return params;
  }, [from, page, perPage, period, search, selectedFilters, to]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await apiFetch(`/admin/reports/${endpointKey}?${queryParams}`, { signal: controller.signal });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.message || "Failed to load this report.");
        setStats(result.stats ?? []);
        setRows(result.rows ?? []);
        setMeta(result.meta ?? { current_page: 1, last_page: 1, total: 0 });
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message || "Failed to load this report.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [endpointKey, queryParams]);

  async function exportCsv() {
    const exportParams = new URLSearchParams(queryParams);
    exportParams.set("page", "1");
    exportParams.set("per_page", "1000");
    const response = await apiFetch(`/admin/reports/${endpointKey}?${exportParams}`);
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.message || "Failed to export this report.");
      return;
    }
    const headings = columns.map((column) => column.label);
    const body = (result.rows ?? []).map((row) => columns.map((column) => String(row[column.key] ?? "").replaceAll('"', '""')));
    const csv = [headings, ...body].map((line) => line.map((cell) => `"${cell}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
        <button type="button" onClick={onBack} className="mb-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">← Back to Reports</button>
        <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{stat.value}</p></div>)}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search report" className="mt-1 block rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal normal-case" /></label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Period<select value={period} onChange={(event) => { setPeriod(event.target.value); setPage(1); }} className="mt-1 block rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal normal-case"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="custom">Custom range</option></select></label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">From<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPeriod("custom"); setPage(1); }} className="mt-1 block rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">To<input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPeriod("custom"); setPage(1); }} className="mt-1 block rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            {filters.map((filter) => <label key={filter.key} className="text-xs font-semibold uppercase tracking-wide text-slate-500">{filter.label}<select value={selectedFilters[filter.key] ?? ""} onChange={(event) => { setSelectedFilters((current) => ({ ...current, [filter.key]: event.target.value })); setPage(1); }} className="mt-1 block rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal normal-case"><option value="">All</option>{filter.options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rows<select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }} className="mt-1 block rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal"><option value="20">20</option><option value="50">50</option><option value="100">100</option></select></label>
            <div className="ml-auto flex gap-2"><button type="button" disabled={isLoading || !rows.length} onClick={() => window.print()} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Print</button><button type="button" disabled={isLoading} onClick={exportCsv} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">Export CSV</button></div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {error ? <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
          {isLoading ? <div className="p-10 text-center text-sm text-slate-500">Loading report data...</div> : <><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr>{columns.map((column) => <th key={column.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{column.label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={row.id ?? index}>{columns.map((column) => <td key={column.key} className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{row[column.key] ?? "—"}</td>)}</tr>)}</tbody></table></div>{!rows.length ? <p className="p-10 text-center text-sm text-slate-500">No report data matches the selected filters.</p> : null}</>}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500"><p>{meta.total} records · Page {meta.current_page} of {meta.last_page}</p><div className="flex gap-2"><button type="button" disabled={page <= 1 || isLoading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 disabled:opacity-40">Previous</button><button type="button" disabled={page >= meta.last_page || isLoading} onClick={() => setPage((value) => value + 1)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 disabled:opacity-40">Next</button></div></div>
      </div>
    </div>
  );
}

export function createStats(labels) {
  return labels.map((label) => ({ label, value: null }));
}
