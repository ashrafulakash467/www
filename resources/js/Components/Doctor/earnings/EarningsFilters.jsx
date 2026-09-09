"use client";

export default function EarningsFilters({ filters, onFilterChange }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From Date</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => onFilterChange({ from: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">To Date</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => onFilterChange({ to: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="released">Released</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="reversed">Reversed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
          <input
            type="text"
            placeholder="Appointment or transaction..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>
    </div>
  );
}
