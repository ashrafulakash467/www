"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/utils/api";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
];

export default function NotificationsPage({ onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, unread: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({ filter, page: String(page), per_page: "20" });
    if (search.trim()) params.set("search", search.trim());
    return params;
  }, [filter, page, search]);

  const loadNotifications = useCallback(async (signal) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiFetch(`/admin/notifications?${query}`, { signal });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load notifications.");
      setNotifications(result.data ?? []);
      setMeta(result.meta ?? { current_page: 1, last_page: 1, total: 0, unread: 0 });
    } catch (requestError) {
      if (requestError.name !== "AbortError") setError(requestError.message || "Could not load notifications.");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadNotifications(controller.signal), 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [loadNotifications]);

  async function markAsRead(item, navigate = false) {
    setActionId(item.id);
    setError("");
    try {
      if (!item.isRead) {
        const response = await apiFetch(`/admin/notifications/${item.id}/read`, { method: "PATCH" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.message || "Could not mark the notification as read.");
        setNotifications((current) => filter === "unread"
          ? current.filter((entry) => entry.id !== item.id)
          : current.map((entry) => entry.id === item.id ? result.data : entry));
        setMeta((current) => ({
          ...current,
          total: filter === "unread" ? Math.max(0, current.total - 1) : current.total,
          unread: Math.max(0, current.unread - 1),
        }));
      }
      if (navigate && item.relatedTab) onNavigate?.(item.relatedTab);
    } catch (requestError) {
      setError(requestError.message || "Could not update the notification.");
    } finally {
      setActionId("");
    }
  }

  async function markAllAsRead() {
    setActionId("all");
    setError("");
    try {
      const response = await apiFetch("/admin/notifications/read-all", { method: "PATCH" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "Could not mark all notifications as read.");
      setNotifications((current) => filter === "unread" ? [] : current.map((item) => ({ ...item, isRead: true, readAt: new Date().toISOString() })));
      setMeta((current) => ({ ...current, total: filter === "unread" ? 0 : current.total, unread: 0 }));
      if (filter === "unread") setPage(1);
    } catch (requestError) {
      setError(requestError.message || "Could not update notifications.");
    } finally {
      setActionId("");
    }
  }

  async function deleteNotification(item) {
    setActionId(item.id);
    setError("");
    try {
      const response = await apiFetch(`/admin/notifications/${item.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "Could not delete the notification.");
      setNotifications((current) => current.filter((entry) => entry.id !== item.id));
      setMeta((current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
        unread: item.isRead ? current.unread : Math.max(0, current.unread - 1),
      }));
    } catch (requestError) {
      setError(requestError.message || "Could not delete the notification.");
    } finally {
      setActionId("");
    }
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Notifications</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">System Notifications</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Real activity from appointments, payments, refunds, users, support, and administration.</p>
        </div>
        <button type="button" onClick={markAllAsRead} disabled={!meta.unread || Boolean(actionId)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
          {actionId === "all" ? "Updating..." : `Mark All as Read${meta.unread ? ` (${meta.unread})` : ""}`}
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => <button key={item.key} type="button" onClick={() => { setFilter(item.key); setPage(1); }} className={`rounded-xl px-4 py-2 text-sm font-semibold ${filter === item.key ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{item.label}</button>)}
        </div>
        <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search notifications..." className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-slate-500 sm:max-w-xs" />
      </div>

      {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}

      <div className="mt-5 space-y-3">
        {isLoading ? <EmptyState text="Loading notifications..." /> : notifications.length ? notifications.map((item) => (
          <article key={item.id} className={`rounded-2xl border p-4 transition sm:p-5 ${item.isRead ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50/50 shadow-sm"}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <button type="button" onClick={() => void markAsRead(item, Boolean(item.relatedTab))} disabled={actionId === item.id} className="min-w-0 flex-1 text-left disabled:opacity-60">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.isRead ? "bg-slate-300" : "bg-blue-600"}`} aria-hidden="true" />
                  <h2 className="font-bold text-slate-950">{item.title}</h2>
                  <TypeBadge type={item.type} />
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${item.isRead ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-700"}`}>{item.isRead ? "Read" : "Unread"}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.message}</p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                  <span>Related user: <strong className="text-slate-700">{item.relatedUser || "System"}</strong></span>
                  <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                  {item.relatedTab ? <span className="font-semibold text-blue-700">Open related details →</span> : null}
                </div>
              </button>
              <div className="flex shrink-0 flex-wrap gap-2">
                {!item.isRead ? <button type="button" disabled={Boolean(actionId)} onClick={() => void markAsRead(item)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40">Mark as Read</button> : null}
                <button type="button" disabled={Boolean(actionId)} onClick={() => void deleteNotification(item)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-40">Delete</button>
              </div>
            </div>
          </article>
        )) : <EmptyState text="No notifications match the selected filter." />}
      </div>

      <footer className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>{meta.total} notifications · Page {meta.current_page} of {meta.last_page}</span>
        <div className="flex gap-2">
          <PageButton disabled={page <= 1 || isLoading} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</PageButton>
          <PageButton disabled={page >= meta.last_page || isLoading} onClick={() => setPage((current) => current + 1)}>Next</PageButton>
        </div>
      </footer>
    </section>
  );
}

function TypeBadge({ type }) {
  const tones = {
    appointment: "bg-cyan-50 text-cyan-700",
    reschedule_request: "bg-amber-50 text-amber-700",
    cancellation: "bg-rose-50 text-rose-700",
    payment: "bg-emerald-50 text-emerald-700",
    refund: "bg-orange-50 text-orange-700",
    doctor_verification: "bg-violet-50 text-violet-700",
    patient: "bg-indigo-50 text-indigo-700",
    support: "bg-fuchsia-50 text-fuchsia-700",
    system: "bg-slate-100 text-slate-700",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tones[type] ?? tones.system}`}>{String(type || "system").replaceAll("_", " ")}</span>;
}

function EmptyState({ text }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">{text}</div>;
}

function PageButton({ children, ...props }) {
  return <button type="button" {...props} className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 disabled:opacity-40">{children}</button>;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "—";
}
