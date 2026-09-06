import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";
import { formatCurrency } from "../Dashboard_Overview/dashboard-shared";

const STATUS = {
    paid: "Paid",
    successful: "Paid",
    success: "Paid",
    completed: "Paid",
    settled: "Paid",
    pending: "Pending",
    processing: "Pending",
    reviewing: "Pending",
    failed: "Failed",
    refund_failed: "Failed",
    cancelled: "Cancelled",
    refunded: "Refunded",
    partially_paid: "Partially Paid",
};
const COLORS = {
    Paid: "bg-emerald-50 text-emerald-700",
    Pending: "bg-amber-50 text-amber-700",
    Failed: "bg-red-50 text-red-700",
    Cancelled: "bg-slate-100 text-slate-600",
    Refunded: "bg-violet-50 text-violet-700",
    "Partially Paid": "bg-blue-50 text-blue-700",
};

export default function PaymentsPage({ view = "overview" }) {
    const [data, setData] = useState(null);
    const [meta, setMeta] = useState(null);
    const [selected, setSelected] = useState(null);
    const [filters, setFilters] = useState({
        search: "",
        date_from: "",
        date_to: "",
        status: "",
        method: "",
        provider: "",
    });
    const [applied, setApplied] = useState({});
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const overview = view === "overview";
    const revenue = view === "revenue";
    const refunds = view.startsWith("refunds-");
    const settings = view === "settings";

    useEffect(() => {
        let stopped = false;
        setLoading(true);
        setError("");
        const params = new URLSearchParams({
            per_page: "20",
            page: String(page),
            ...applied,
        });
        if (view === "successful") params.set("status", "paid");
        if (view === "pending") params.set("status", "pending");
        if (view === "failed") params.set("status", "failed");
        if (refunds && view !== "refunds-all")
            params.set(
                "refund_status",
                {
                    "refunds-pending": "requested",
                    "refunds-approved": "approved",
                    "refunds-rejected": "rejected",
                    "refunds-completed": "completed",
                }[view] || "",
            );
        const endpoint = overview
            ? "/admin/payments/overview"
            : revenue
              ? "/admin/payments/revenue"
              : refunds
                ? "/admin/refunds"
                : settings
                  ? "/admin/payments/settings"
                  : "/admin/payments";
        apiFetch(`${endpoint}?${params}`)
            .then(async (response) => {
                const result = await response.json().catch(() => ({}));
                if (!response.ok)
                    throw new Error(
                        result.message || "Could not load payment data.",
                    );
                if (stopped) return;
                setData(result.data ?? {});
                setMeta(result.meta ?? null);
            })
            .catch((err) => !stopped && setError(err.message))
            .finally(() => !stopped && setLoading(false));
        return () => {
            stopped = true;
        };
    }, [view, page, applied]);

    async function openDetails(payment) {
        try {
            const response = await apiFetch(`/admin/payments/${payment.id}`);
            const result = await response.json();
            if (!response.ok)
                throw new Error(
                    result.message || "Could not load payment details.",
                );
            setSelected(result.data);
        } catch (err) {
            setError(err.message);
        }
    }
    async function refundAction(payment, action) {
        if (
            !window.confirm(
                `${action === "approve" ? "Approve" : action === "reject" ? "Reject" : "Process"} this refund?`,
            )
        )
            return;
        try {
            const response = await apiFetch(
                `/admin/refunds/${payment.id}/${action === "process" ? "process" : action}`,
                {
                    method: action === "process" ? "POST" : "PATCH",
                    body: JSON.stringify({}),
                },
            );
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.message || "Refund action failed.");
            setMessage(result.message);
            setApplied((current) => ({ ...current }));
        } catch (err) {
            setError(err.message);
        }
    }
    function apply(event) {
        event.preventDefault();
        setPage(1);
        setApplied({ ...filters });
    }
    function reset() {
        const empty = {
            search: "",
            date_from: "",
            date_to: "",
            status: "",
            method: "",
            provider: "",
        };
        setFilters(empty);
        setApplied({});
        setPage(1);
    }
    function exportCsv(extension = "csv") {
        if (!Array.isArray(data) || !data.length) return;
        const fields = [
            "transactionNumber",
            "appointment.id",
            "patient.name",
            "doctor.name",
            "totalAmount",
            "currency",
            "method",
            "provider",
            "status",
            "paidAt",
            "createdAt",
        ];
        const value = (item, path) =>
            path.split(".").reduce((current, key) => current?.[key], item) ??
            "";
        const csv = [
            fields,
            ...data.map((item) =>
                fields.map(
                    (field) =>
                        `"${String(value(item, field)).replaceAll('"', '""')}"`,
                ),
            ),
        ]
            .map((row) => row.join(","))
            .join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = `payments.${extension}`;
        link.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Admin Payments
                    </p>
                    <h1 className="mt-2 text-2xl font-bold text-slate-950">
                        {title(view)}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Live payment and refund data from the database.
                    </p>
                </div>
                {!overview && !revenue && !settings ? (
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => exportCsv("csv")}
                            disabled={!data?.length}
                            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            CSV
                        </button>
                        <button
                            type="button"
                            onClick={() => exportCsv("xls")}
                            disabled={!data?.length}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
                        >
                            Excel
                        </button>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                        >
                            Print / PDF
                        </button>
                    </div>
                ) : null}
            </header>
            {error ? (
                <div className="flex justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() =>
                            setApplied((current) => ({ ...current }))
                        }
                        className="font-semibold underline"
                    >
                        Retry
                    </button>
                </div>
            ) : null}
            {message ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {message}
                </p>
            ) : null}
            {overview ? (
                <Overview data={data} loading={loading} />
            ) : revenue ? (
                <Revenue data={data} loading={loading} />
            ) : settings ? (
                <PaymentSettings data={data} />
            ) : (
                <>
                    <Filters
                        filters={filters}
                        setFilters={setFilters}
                        onApply={apply}
                        onReset={reset}
                    />
                    <PaymentTable
                        payments={data}
                        loading={loading}
                        refunds={refunds}
                        onView={openDetails}
                        onRefund={refundAction}
                    />
                    <Pagination meta={meta} page={page} setPage={setPage} />
                </>
            )}
            {selected ? (
                <PaymentDetails
                    payment={selected}
                    onClose={() => setSelected(null)}
                />
            ) : null}
        </div>
    );
}

function Overview({ data, loading }) {
    if (loading) return <Loading />;
    if (!data) return <Empty />;
    const cards = [
        ["Total Revenue", data.totalRevenue],
        ["Today's Revenue", data.todayRevenue],
        ["Successful Payments", data.successfulPayments, true],
        ["Pending Payments", data.pendingPayments ?? 0, true],
        ["Failed Payments", data.failedPayments, true],
        ["Refunded Amount", data.refundedAmount],
        ["Net Revenue", data.netRevenue],
        ["Due Amount", data.dueAmount],
    ];
    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map(([label, value, count]) => (
                    <div
                        key={label}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {label}
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-950">
                            {count ? value : money(value)}
                        </p>
                    </div>
                ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                <Chart title="Revenue trend" values={data.trend} />
                <Distribution
                    title="Payment status"
                    values={data.statusDistribution}
                />
                <Distribution
                    title="Payment methods"
                    values={data.methodDistribution}
                />
                <Recent
                    title="Recent transactions"
                    items={data.recentTransactions}
                />
            </div>
        </div>
    );
}
function Revenue({ data, loading }) {
    if (loading) return <Loading />;
    if (!data) return <Empty />;
    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    ["Gross Revenue", data.grossRevenue],
                    ["Discount", data.discount],
                    ["Tax", data.tax],
                    ["Refund", data.refund],
                    ["Paid Amount", data.paidAmount],
                    ["Due Amount", data.dueAmount],
                ].map(([label, value]) => (
                    <div
                        key={label}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {label}
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-950">
                            {money(value)}
                        </p>
                    </div>
                ))}
            </div>
            <Chart title="Daily revenue" values={data.daily} />
            <Distribution
                title="Revenue by payment method"
                values={data.byMethod}
            />
            <Distribution title="Revenue by gateway" values={data.byGateway} />
        </div>
    );
}
function Filters({ filters, setFilters, onApply, onReset }) {
    const update = (key, value) =>
        setFilters((current) => ({ ...current, [key]: value }));
    return (
        <form
            onSubmit={onApply}
            className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
        >
            {[
                ["search", "Search", "text", "Transaction or patient"],
                ["date_from", "Date from", "date"],
                ["date_to", "Date to", "date"],
                ["status", "Status", "text", "paid / pending"],
                ["method", "Method", "text", "card / bKash"],
                ["provider", "Provider", "text", "SSLCommerz"],
            ].map(([key, label, type, placeholder]) => (
                <label
                    key={key}
                    className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                    {label}
                    <input
                        type={type}
                        value={filters[key]}
                        onChange={(event) => update(key, event.target.value)}
                        placeholder={placeholder}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case text-slate-800"
                    />
                </label>
            ))}
            <div className="flex items-end gap-2">
                <button
                    type="submit"
                    className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
                >
                    Apply
                </button>
                <button
                    type="button"
                    onClick={onReset}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                    Reset
                </button>
            </div>
        </form>
    );
}
function PaymentTable({ payments, loading, refunds, onView, onRefund }) {
    if (loading) return <Loading />;
    if (!payments?.length) return <Empty />;
    return (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[1050px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                        {[
                            "Transaction",
                            "Appointment",
                            "Patient",
                            "Doctor",
                            "Amount",
                            "Method / Gateway",
                            "Status",
                            "Dates",
                            "Actions",
                        ].map((head) => (
                            <th key={head} className="px-4 py-3">
                                {head}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {payments.map((item) => (
                        <tr key={item.id} className="align-top">
                            <td className="px-4 py-4 font-semibold">
                                {item.transactionNumber}
                                <p className="text-xs font-normal text-slate-400">
                                    {item.gatewayTransactionId ||
                                        "No gateway ID"}
                                </p>
                            </td>
                            <td className="px-4 py-4">
                                {item.appointment?.id || "-"}
                            </td>
                            <td className="px-4 py-4">
                                {item.patient?.name || "-"}
                                <p className="text-xs text-slate-400">
                                    {item.patient?.email || ""}
                                </p>
                            </td>
                            <td className="px-4 py-4">
                                {item.doctor?.name || "-"}
                            </td>
                            <td className="px-4 py-4 font-semibold">
                                {money(item.totalAmount, item.currency)}
                            </td>
                            <td className="px-4 py-4">
                                {item.method || "-"}
                                <p className="text-xs text-slate-400">
                                    {item.provider || item.gateway || "-"}
                                </p>
                            </td>
                            <td className="px-4 py-4">
                                <StatusBadge
                                    value={
                                        refunds
                                            ? item.refundStatus
                                            : item.status
                                    }
                                />
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-500">
                                {date(item.paidAt)}
                                <br />
                                {date(item.createdAt)}
                            </td>
                            <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onView(item)}
                                        className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                                    >
                                        View
                                    </button>
                                    {refunds &&
                                    item.refundStatus === "requested" ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onRefund(item, "approve")
                                                }
                                                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onRefund(item, "reject")
                                                }
                                                className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                                            >
                                                Reject
                                            </button>
                                        </>
                                    ) : null}
                                    {refunds &&
                                    item.refundStatus === "approved" ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onRefund(item, "process")
                                            }
                                            className="rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white"
                                        >
                                            Process
                                        </button>
                                    ) : null}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
function PaymentDetails({ payment, onClose }) {
    return (
        <div
            className="fixed inset-0 z-50 bg-slate-950/35"
            role="presentation"
            onMouseDown={(event) =>
                event.target === event.currentTarget && onClose()
            }
        >
            <aside
                className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl sm:p-8"
                role="dialog"
                aria-modal="true"
            >
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Payment Details
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-slate-950">
                            {payment.transactionNumber}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border px-3 py-1.5 text-sm"
                    >
                        X
                    </button>
                </div>
                <div className="space-y-5 pt-5">
                    <Group
                        title="Transaction Information"
                        values={[
                            [
                                "Gateway transaction",
                                payment.gatewayTransactionId,
                            ],
                            ["Provider", payment.provider],
                            ["Gateway", payment.gateway],
                            ["Method", payment.method],
                            ["Currency", payment.currency],
                            ["Status", display(payment.status)],
                            ["Paid at", date(payment.paidAt)],
                            ["Created at", date(payment.createdAt)],
                        ]}
                    />
                    <Group
                        title="Appointment Information"
                        values={[
                            ["Appointment", payment.appointment?.id],
                            ["Date", payment.appointment?.date],
                            ["Time", payment.appointment?.time],
                            ["Status", payment.appointment?.status],
                        ]}
                    />
                    <Group
                        title="Patient Information"
                        values={[
                            ["Name", payment.patient?.name],
                            ["Email", payment.patient?.email],
                            ["Phone", payment.patient?.phone],
                        ]}
                    />
                    <Group
                        title="Doctor Information"
                        values={[
                            ["Name", payment.doctor?.name],
                            ["Email", payment.doctor?.email],
                            ["Phone", payment.doctor?.phone],
                            ["Specialization", payment.doctor?.specialty],
                        ]}
                    />
                    <Group
                        title="Financial Breakdown"
                        values={[
                            ["Amount", money(payment.amount, payment.currency)],
                            [
                                "Discount",
                                money(payment.discount, payment.currency),
                            ],
                            ["Tax", money(payment.tax, payment.currency)],
                            [
                                "Total amount",
                                money(payment.totalAmount, payment.currency),
                            ],
                            [
                                "Paid amount",
                                money(payment.paidAmount, payment.currency),
                            ],
                            [
                                "Due amount",
                                money(payment.dueAmount, payment.currency),
                            ],
                            [
                                "Refunded amount",
                                money(payment.refundAmount, payment.currency),
                            ],
                        ]}
                    />
                </div>
            </aside>
        </div>
    );
}
function Group({ title, values }) {
    return (
        <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {title}
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {values.map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                            {value || "Not available"}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
function StatusBadge({ value }) {
    const label = display(value);
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${COLORS[label] || COLORS.Pending}`}
        >
            {label}
        </span>
    );
}
function Pagination({ meta, page, setPage }) {
    return meta?.last_page > 1 ? (
        <div className="flex justify-between text-sm text-slate-500">
            <span>
                Page {page} of {meta.last_page} ({meta.total})
            </span>
            <div className="flex gap-2">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                    className="rounded-lg border px-3 py-2 disabled:opacity-40"
                >
                    Previous
                </button>
                <button
                    type="button"
                    disabled={page >= meta.last_page}
                    onClick={() => setPage((current) => current + 1)}
                    className="rounded-lg border px-3 py-2 disabled:opacity-40"
                >
                    Next
                </button>
            </div>
        </div>
    ) : null;
}
function Chart({ title, values = {} }) {
    const entries = Object.entries(values);
    const max = Math.max(...entries.map(([, value]) => Number(value)), 1);
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold">{title}</h3>
            {entries.length ? (
                <div className="mt-5 flex h-44 items-end gap-2">
                    {entries.slice(-14).map(([key, value]) => (
                        <div
                            key={key}
                            className="flex min-w-0 flex-1 flex-col items-center gap-2"
                        >
                            <div
                                className="w-full rounded-t bg-emerald-500"
                                style={{
                                    height: `${Math.max(6, (Number(value) / max) * 130)}px`,
                                }}
                            />
                            <span className="truncate text-[10px] text-slate-400">
                                {key.slice(5)}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <Empty compact />
            )}
        </section>
    );
}
function Distribution({ title, values = {} }) {
    const entries = Object.entries(values);
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold">{title}</h3>
            {entries.length ? (
                <div className="mt-4 space-y-3">
                    {entries.map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                            <span className="capitalize text-slate-600">
                                {key || "Unknown"}
                            </span>
                            <b>{value}</b>
                        </div>
                    ))}
                </div>
            ) : (
                <Empty compact />
            )}
        </section>
    );
}
function Recent({ title, items = [] }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold">{title}</h3>
            {items.length ? (
                <div className="mt-4 space-y-3">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="flex justify-between border-b border-slate-100 pb-3 text-sm"
                        >
                            <div>
                                <b>{item.transactionNumber}</b>
                                <p className="text-xs text-slate-500">
                                    {item.patient?.name || "Patient"}
                                </p>
                            </div>
                            <div className="text-right">
                                <b>{money(item.totalAmount, item.currency)}</b>
                                <br />
                                <StatusBadge value={item.status} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <Empty compact />
            )}
        </section>
    );
}
function PaymentSettings({ data = {} }) {
    const [form, setForm] = useState({
        gateway: "SSLCommerz",
        mode: "test",
        currency: "BDT",
        tax: "0",
        refund_enabled: true,
        required: true,
    });
    const [saved, setSaved] = useState("");
    useEffect(
        () =>
            setForm((current) => ({
                ...current,
                gateway: data["payment:gateway"] || current.gateway,
                mode: data["payment:mode"] || current.mode,
                currency: data["payment:currency"] || current.currency,
                tax: data["payment:tax"] ?? current.tax,
                refund_enabled:
                    data["payment:refund_enabled"] ?? current.refund_enabled,
                required: data["payment:required"] ?? current.required,
            })),
        [data],
    );
    async function save(event) {
        event.preventDefault();
        const response = await apiFetch("/admin/payments/settings", {
            method: "PUT",
            body: JSON.stringify(form),
        });
        const result = await response.json();
        setSaved(
            response.ok
                ? result.message
                : result.message || "Could not save settings.",
        );
    }
    return (
        <form
            onSubmit={save}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
            <h3 className="text-lg font-bold">Payment Settings</h3>
            <p className="mt-2 text-sm text-slate-500">
                Gateway secrets remain server-side and are never exposed here.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Input
                    label="Gateway"
                    value={form.gateway}
                    onChange={(value) =>
                        setForm((current) => ({ ...current, gateway: value }))
                    }
                />
                <Input
                    label="Currency"
                    value={form.currency}
                    onChange={(value) =>
                        setForm((current) => ({ ...current, currency: value }))
                    }
                />
                <Input
                    label="Tax %"
                    type="number"
                    value={form.tax}
                    onChange={(value) =>
                        setForm((current) => ({ ...current, tax: value }))
                    }
                />
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Mode
                    <select
                        value={form.mode}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,
                                mode: event.target.value,
                            }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case"
                    >
                        <option value="test">Test</option>
                        <option value="production">Production</option>
                    </select>
                </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-700">
                <label>
                    <input
                        type="checkbox"
                        checked={form.refund_enabled}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,
                                refund_enabled: event.target.checked,
                            }))
                        }
                    />{" "}
                    Refunds enabled
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={form.required}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,
                                required: event.target.checked,
                            }))
                        }
                    />{" "}
                    Payment required
                </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
                <span className="text-sm text-emerald-700">{saved}</span>
                <button
                    type="submit"
                    className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                >
                    Save Settings
                </button>
            </div>
        </form>
    );
}
function Loading() {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
            Loading payment data...
        </div>
    );
}
function Empty({ compact = false }) {
    return (
        <p
            className={
                compact
                    ? "mt-5 text-sm text-slate-500"
                    : "rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500"
            }
        >
            No payments found. Try changing your filters or date range.
        </p>
    );
}
function display(value) {
    return (
        STATUS[String(value ?? "").toLowerCase()] ||
        String(value || "Pending").replaceAll("_", " ")
    );
}
function money(value, currency = "BDT") {
    return formatCurrency(Number(value || 0) * 100, currency);
}
function date(value) {
    return value ? new Date(value).toLocaleString() : "-";
}
function title(view) {
    return (
        {
            overview: "Overview",
            all: "All Payments",
            successful: "Successful Payments",
            pending: "Pending Payments",
            failed: "Failed Payments",
            "refunds-all": "All Refunds",
            "refunds-pending": "Pending Refund Requests",
            "refunds-approved": "Approved Refunds",
            "refunds-rejected": "Rejected Refunds",
            "refunds-completed": "Completed Refunds",
            transactions: "Transactions",
            revenue: "Revenue",
            // settings: "Payment Settings",
        }[view] || "Payments"
    );
}
