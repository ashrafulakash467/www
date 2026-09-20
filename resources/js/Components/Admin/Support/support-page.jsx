"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/utils/api";

const SECTIONS = [
  { key: "reschedule", title: "Reschedule Requests", description: "Review pending patient reschedule requests.", tone: "bg-blue-50 text-blue-700" },
  { key: "cancellation", title: "Cancellation & Refund Requests", description: "Confirm cancellations and review payment and refund details.", tone: "bg-rose-50 text-rose-700" },
  { key: "messages", title: "All Message", description: "Read messages submitted from the Contact page.", tone: "bg-violet-50 text-violet-700" },
];

export default function SupportPage({ onMessage }) {
  const [activeSection, setActiveSection] = useState(null);
  const [counts, setCounts] = useState({ reschedule: 0, cancellation: 0, messages: 0 });
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionKey, setActionKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCounts = useCallback(async () => {
    try {
      const [reschedule, cancellation, messages] = await Promise.all([
        apiFetch("/admin/support/appointment-requests?type=reschedule&per_page=1"),
        apiFetch("/admin/support/appointment-requests?type=cancellation&per_page=1"),
        apiFetch("/admin/support/contact-messages?per_page=1"),
      ]);
      const [rescheduleData, cancellationData, messagesData] = await Promise.all([reschedule.json(), cancellation.json(), messages.json()]);
      setCounts({ reschedule: rescheduleData.meta?.total ?? 0, cancellation: cancellationData.meta?.total ?? 0, messages: messagesData.meta?.total ?? 0 });
    } catch {
      // The opened section displays request errors.
    }
  }, []);

  useEffect(() => { void loadCounts(); }, [loadCounts]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ type: activeSection ?? "", page: String(page), per_page: "20" });
    if (search.trim()) params.set("search", search.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params;
  }, [activeSection, from, page, search, to]);

  const loadSection = useCallback(async (signal) => {
    if (!activeSection) return;
    setIsLoading(true); setError("");
    try {
      const endpoint = activeSection === "messages"
        ? "/admin/support/contact-messages"
        : "/admin/support/appointment-requests";
      const response = await apiFetch(`${endpoint}?${query}`, { signal });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load support records.");
      setItems(result.data ?? []);
      setMeta(result.meta ?? { current_page: 1, last_page: 1, total: 0 });
    } catch (requestError) {
      if (requestError.name !== "AbortError") setError(requestError.message || "Could not load support records.");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [activeSection, query]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadSection(controller.signal), 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [loadSection]);

  function openSection(key) {
    setActiveSection(key); setSelectedItem(null); setPage(1); setSearch(""); setFrom(""); setTo(""); setError(""); setNotice("");
  }

  async function decideRequest(item, decision) {
    setActionKey(`${item.id}-${decision}`); setError(""); setNotice("");
    try {
      const response = await apiFetch("/appointment/decision", { method: "POST", body: JSON.stringify({ appointmentId: item.appointmentNumber, decision }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Could not process the request.");
      setSelectedItem(null); setNotice(result.message || "Request processed successfully."); onMessage?.(result.message);
      await Promise.all([loadSection(), loadCounts()]);
    } catch (requestError) { setError(requestError.message); }
    finally { setActionKey(""); }
  }

  const currentSection = SECTIONS.find((section) => section.key === activeSection);

  return <section className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Support</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Request Management</h1><p className="mt-2 text-sm text-slate-500">Review patient requests and Contact page messages.</p></header>
    <div className="grid gap-4 md:grid-cols-3">{SECTIONS.map((section, index) => <button key={section.key} type="button" onClick={() => openSection(section.key)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><span className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold ${section.tone}`}>{String(index + 1).padStart(2, "0")}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{counts[section.key]}</span></div><h2 className="mt-5 text-lg font-bold text-slate-950">{section.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{section.description}</p><span className="mt-4 inline-flex text-sm font-semibold text-slate-700">Open section →</span></button>)}</div>

    {activeSection ? <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[2px]" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget && !actionKey) setActiveSection(null); }}><aside className="flex h-full w-full max-w-5xl flex-col bg-slate-50 shadow-2xl"><header className="flex items-start justify-between border-b border-slate-200 bg-white px-5 py-5 sm:px-7"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Request Management</p><h2 className="mt-1 text-2xl font-bold text-slate-950">{selectedItem ? (activeSection === "messages" ? selectedItem.subject : selectedItem.appointmentNumber) : currentSection?.title}</h2></div><button type="button" disabled={Boolean(actionKey)} onClick={() => { setActiveSection(null); setSelectedItem(null); }} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-xl">×</button></header><div className="flex-1 overflow-y-auto p-4 sm:p-6">{selectedItem ? (activeSection === "messages" ? <MessageDetail item={selectedItem} onBack={() => setSelectedItem(null)} /> : <RequestDetail item={selectedItem} section={activeSection} actionKey={actionKey} onBack={() => setSelectedItem(null)} onDecision={decideRequest} />) : (activeSection === "messages" ? <ContactMessageList items={items} isLoading={isLoading} search={search} setSearch={(value) => { setSearch(value); setPage(1); }} from={from} setFrom={(value) => { setFrom(value); setPage(1); }} to={to} setTo={(value) => { setTo(value); setPage(1); }} onView={setSelectedItem} /> : <RequestList items={items} isLoading={isLoading} search={search} setSearch={(value) => { setSearch(value); setPage(1); }} from={from} setFrom={(value) => { setFrom(value); setPage(1); }} to={to} setTo={(value) => { setTo(value); setPage(1); }} onView={setSelectedItem} />)}{error ? <Message tone="error">{error}</Message> : null}{notice ? <Message>{notice}</Message> : null}</div>{!selectedItem ? <footer className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-4 text-sm text-slate-500"><span>{meta.total} records · Page {meta.current_page} of {meta.last_page}</span><div className="flex gap-2"><PageButton disabled={page <= 1 || isLoading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</PageButton><PageButton disabled={page >= meta.last_page || isLoading} onClick={() => setPage((value) => value + 1)}>Next</PageButton></div></footer> : null}</aside></div> : null}
  </section>;
}

function RequestList({ items, isLoading, search, setSearch, from, setFrom, to, setTo, onView }) {
  return <div className="space-y-5"><div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4"><Field label="Search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Patient, doctor, or appointment" /></Field><Field label="From"><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field><Field label="To"><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></Field></div>{isLoading ? <Empty text="Loading requests..." /> : items.length ? <div className="space-y-3">{items.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold text-slate-950">{item.patient?.name || "Patient"}</h3><p className="mt-1 text-sm text-slate-500">{item.appointmentNumber} · Dr. {item.doctor?.name || "Unknown"}</p><p className="mt-2 text-xs text-slate-500">{item.appointmentDate} at {item.slotTime || "Not set"} · Requested {formatDate(item.requestedAt)}</p></div><div className="flex items-center gap-2"><Badge value={item.status} /><button type="button" onClick={() => onView(item)} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">View</button></div></div></article>)}</div> : <Empty text="No requests match the selected filters." />}</div>;
}

function ContactMessageList({ items, isLoading, search, setSearch, from, setFrom, to, setTo, onView }) {
  return <div className="space-y-5"><div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4"><Field label="Search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, subject, or message" /></Field><Field label="From"><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field><Field label="To"><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></Field></div>{isLoading ? <Empty text="Loading messages..." /> : items.length ? <div className="space-y-3">{items.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h3 className="truncate font-bold text-slate-950">{item.subject}</h3><p className="mt-1 text-sm text-slate-500">{item.name} · {item.email}</p><p className="mt-2 text-xs text-slate-500">Received {formatDate(item.createdAt)}</p></div><button type="button" onClick={() => onView(item)} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">View</button></div></article>)}</div> : <Empty text="No messages match the selected filters." />}</div>;
}

function MessageDetail({ item, onBack }) {
  return <div className="space-y-5"><button type="button" onClick={onBack} className="text-sm font-semibold text-slate-700">← Back to messages</button><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 sm:grid-cols-2"><Info title="Sender" rows={[["Name", item.name], ["Email", item.email]]} /><Info title="Message information" rows={[["Subject", item.subject], ["Received", formatDate(item.createdAt)], ["Updated", formatDate(item.updatedAt)]]} /></div><div className="mt-5 rounded-2xl bg-slate-50 p-5"><h3 className="font-bold text-slate-950">Message</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{item.message}</p></div><a href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: ${item.subject}`)}`} className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Reply by email</a></section></div>;
}

function RequestDetail({ item, section, actionKey, onBack, onDecision }) {
  return <div className="space-y-5"><button type="button" onClick={onBack} className="text-sm font-semibold text-slate-700">← Back to requests</button><div className="grid gap-4 lg:grid-cols-2"><Info title="Patient" rows={[["Name", item.patient?.name], ["Email", item.patient?.email], ["Phone", item.patient?.phone]]} /><Info title="Appointment" rows={[["Number", item.appointmentNumber], ["Doctor", item.doctor?.name], ["Current date", item.appointmentDate], ["Current time", item.slotTime], ["Requested date", item.requestedDate], ["Requested time", item.requestedTime], ["Reason", item.reason]]} /><Info title="Payment & Refund" rows={[["Transaction", item.payment?.transactionNumber], ["Payment status", item.payment?.status], ["Paid amount", money(item.payment)], ["Refund status", item.payment?.refundStatus], ["Refund amount", item.payment ? `${item.payment.currency || "BDT"} ${item.payment.refundAmount ?? 0}` : null], ["Refund reference", item.payment?.refundReference], ["Refund reason", item.payment?.refundReason], ["Refund requested", formatDate(item.payment?.refundRequestedAt)], ["Refund processed", formatDate(item.payment?.refundProcessedAt)]]} /></div><div className="flex flex-wrap gap-2"><button type="button" disabled={Boolean(actionKey)} onClick={() => onDecision(item, "accepted")} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{actionKey.endsWith("accepted") ? "Confirming..." : section === "cancellation" ? "Confirm cancellation & refund" : "Approve reschedule"}</button><button type="button" disabled={Boolean(actionKey)} onClick={() => onDecision(item, "rejected")} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">{actionKey.endsWith("rejected") ? "Rejecting..." : "Reject request"}</button></div></div>;
}

function Field({ label, children }) { return <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}<span className="mt-1 block [&>input]:rounded-xl [&>input]:border [&>input]:border-slate-300 [&>input]:px-3 [&>input]:py-2 [&>input]:text-sm [&>input]:font-normal [&>input]:normal-case">{children}</span></label>; }
function Info({ title, rows }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-950">{title}</h3><dl className="mt-4 space-y-3">{rows.map(([key, value]) => <div key={key} className="flex justify-between gap-4 text-sm"><dt className="text-slate-500">{key}</dt><dd className="text-right font-semibold text-slate-900">{value || "—"}</dd></div>)}</dl></section>; }
function Badge({ value }) { return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-amber-700">{String(value ?? "").replaceAll("_", " ")}</span>; }
function Empty({ text }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{text}</div>; }
function Message({ children, tone = "success" }) { return <p className={`mt-4 rounded-xl border p-4 text-sm ${tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{children}</p>; }
function PageButton({ children, ...props }) { return <button type="button" {...props} className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 disabled:opacity-40">{children}</button>; }
function formatDate(value) { return value ? new Date(value).toLocaleString() : "—"; }
function money(payment) { return payment ? `${payment.currency || "BDT"} ${Number(payment.paidAmount ?? 0).toLocaleString("en-BD", { maximumFractionDigits: 2 })}` : "—"; }
