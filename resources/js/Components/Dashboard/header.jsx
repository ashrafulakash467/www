"use client";

import { useEffect, useRef, useState } from "react";

const SIDEBAR_TOGGLE_EVENT = "dashboard-sidebar-toggle";

export default function DashboardHeader({
  user,
  title,
  subtitle,
  roleLabel,
  onToggleSidebar,
  showSidebarToggle = false,
  disableMobileSidebarToggle = false,
  onLogout,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user?.name || roleLabel || "User";
  const displayEmail = user?.email || "";
  const avatarSrc = user?.avatar || user?.image || "";
  const avatarFallback = displayName?.charAt(0)?.toUpperCase() || "U";

  function handleLogoutClick() {
    setMenuOpen(false);
    onLogout?.();
  }

  function handleSidebarToggle() {
    if (disableMobileSidebarToggle && window.innerWidth < 768) {
      return;
    }

    if (typeof onToggleSidebar === "function") {
      onToggleSidebar();
      return;
    }

    window.dispatchEvent(new Event(SIDEBAR_TOGGLE_EVENT));
  }

  return (
    <header className="sticky top-0 z-40 border-b h-20 border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex w-full items-center justify-between px-2 py-2">
        
        <div className="flex min-w-0 items-center justify-between gap-3">
          {/* Left: Logo + Title */}
          <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-slate-50 px-2 py-2">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-lg font-semibold text-brand-foreground shadow-lg shadow-brand/25">
              HC
            </span>

            <h1 className="text-sm font-bold color- leading-tight text-slate-950">
              {title
                ? title.split(" ").map((word, index) => (
                    <span key={index} className="block">
                      {word}
                    </span>
                  ))
                : "Dashboard"}
            </h1>
          {/* Right: 3-line button */}
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            onClick={handleSidebarToggle}
          >
            <span className="flex flex-col gap-1">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </span>
          </button>
          </div>

        </div>

        <div className="flex items-center gap-3">
          {showSidebarToggle ? (
            <button
              type="button"
              onClick={handleSidebarToggle}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              aria-label="Toggle sidebar"
            >
              <span className="flex flex-col gap-1.5">
                <span className="block h-0.5 w-5 rounded bg-current" />
                <span className="block h-0.5 w-5 rounded bg-current" />
                <span className="block h-0.5 w-5 rounded bg-current" />
              </span>
            </button>
          ) : null}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:bg-slate-50"
            >
              <span className="h-11 w-11 overflow-hidden rounded-full bg-emerald-100">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-slate-900 text-sm font-bold text-white">
                    {avatarFallback}
                  </span>
                )}
              </span>

              <span className="hidden min-w-0 sm:block">
                <span className="block truncate text-sm font-semibold text-slate-950">
                  {displayName}
                </span>

                <span className="block truncate text-xs text-slate-500">
                  {displayEmail || roleLabel || "User"}
                </span>
              </span>
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-slate-950">
                    {displayName}
                  </p>

                  <p className="truncate text-xs text-slate-500">
                    {displayEmail || roleLabel || "User"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-red-100"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
