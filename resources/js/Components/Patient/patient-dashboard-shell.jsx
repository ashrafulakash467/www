"use client";

import { Link } from "@inertiajs/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "./dashboard-shared";

const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard Overview",
    icon: <Icon name="dashboard" />,
    href: "/patient/dashboard",
  },
  {
    key: "appointments",
    label: "My Appointment",
    icon: <FontAwesomeIcon icon={faCalendarDays} />,
    href: "/patient/appointments",
  },
  {
    key: "records",
    label: "Medical Records",
    icon: <Icon name="records" />,
    href: "/patient/medical-records",
  },
  {
    key: "find-doctor",
    label: "Find Doctors",
    icon: <Icon name="doctors" />,
    href: "/find-doctor",
  },
  {
    key: "settings",
    label: "Settings",
    icon: <Icon name="settings" />,
    href: "/patient/settings",
  },
];

export default function PatientDashboardShell({
  patient,
  activeTab,
  children,
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl bg-slate-50 font-sans text-slate-900">
      <aside className="sticky top-0 flex h-screen w-64 flex-shrink-0 flex-col justify-between border-r border-slate-200 bg-white">
        <div>
          <div className="flex h-16 items-center border-b border-slate-100 px-6">
            <span className="text-lg font-bold text-slate-900">
              HealthPortal
            </span>
          </div>

          <nav className="space-y-1 p-4">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.key;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  preserveState
                  preserveScroll
                  prefetch
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-300 hover:text-slate-900"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-700">
              {patient?.name?.charAt(0) || "P"}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-sm font-bold text-slate-900">
                {patient?.name}
              </p>
              <p className="truncate text-xs text-slate-500">
                {patient?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
