export function Icon({ name, className = "w-5 h-5" }) {
  const icons = {
    dashboard: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    ),
    records: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
    calendar: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    ),
    doctors: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    ),
    settings: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Zm7.4-2.5a1.8 1.8 0 0 0 .36 1.98l.05.05a2.2 2.2 0 0 1-1.56 3.76 2.2 2.2 0 0 1-1.56-.65l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.09 1.65V20a2.2 2.2 0 0 1-4.4 0v-.06a1.8 1.8 0 0 0-1.09-1.65 1.8 1.8 0 0 0-1.98.36l-.04.04a2.2 2.2 0 0 1-3.12-3.12l.05-.05a1.8 1.8 0 0 0 .36-1.98 1.8 1.8 0 0 0-1.65-1.09H4a2.2 2.2 0 0 1 0-4.4h.06c.74 0 1.4-.44 1.65-1.09a1.8 1.8 0 0 0-.36-1.98l-.05-.05A2.2 2.2 0 0 1 8.44 3.2a2.2 2.2 0 0 1 1.56.65l.04.04c.51.51 1.26.67 1.98.36A1.8 1.8 0 0 0 13.11 2.6V2a2.2 2.2 0 0 1 4.4 0v.06c0 .74.44 1.4 1.09 1.65.72.31 1.47.15 1.98-.36l.04-.04a2.2 2.2 0 0 1 3.12 3.12l-.05.05c-.51.51-.67 1.26-.36 1.98.25.65.91 1.09 1.65 1.09H22a2.2 2.2 0 0 1 0 4.4h-.06c-.74 0-1.4.44-1.65 1.09Z"
      />
    ),
    logout: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    ),
    download: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    ),
    share: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    ),
    upload: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    ),
    printer: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 9V3h12v6M6 18H5a2 2 0 01-2-2v-4a3 3 0 013-3h14a3 3 0 013 3v4a2 2 0 01-2 2h-1m-4 0H8m4 0v3m0-3a2 2 0 100 4 2 2 0 000-4z"
      />
    ),
    eye: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    ),
  };

  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      {icons[name] || null}
    </svg>
  );
}

export function InfoCard({ title, value }) {
  return (
    <div className="flex justify-around p-4 ">
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
        {title}:
      </p>
      <p className="text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

export function parseAppointmentDateTime(appointmentDate, slotTime) {
  if (!appointmentDate || !slotTime) {
    return null;
  }

  const direct = new Date(`${appointmentDate}T${slotTime}`);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const fallback = new Date(`${appointmentDate} ${slotTime}`);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function formatTimeLeft(milliseconds) {
  if (!Number.isFinite(milliseconds)) {
    return "Unavailable";
  }

  if (milliseconds <= 0) {
    return "Now / passed";
  }

  const totalMinutes = Math.floor(milliseconds / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  return `${minutes}m left`;
}

export function formatCurrency(amountCents, currency) {
  const amount = Number(amountCents ?? 0) / 100;
  const code = currency || "BDT";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(0)}`;
  }
}

export function getStatusTone(status) {
  if (status === "cancelled") {
    return "bg-red-50 text-red-700";
  }

  if (status === "confirmed") {
    return "bg-emerald-50 text-emerald-700";
  }

  return "bg-blue-50 text-blue-700";
}

export function getPaymentTone(paymentStatus) {
  if (paymentStatus === "paid") {
    return "text-emerald-700";
  }

  if (paymentStatus === "pending") {
    return "text-amber-700";
  }

  return "text-slate-500";
}
