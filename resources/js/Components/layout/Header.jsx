"use client";

import { Link } from "@inertiajs/react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/utils/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { clearAllAuthSessions, getActiveDashboardPath } from "@/utils/api";
import SearchPage from "@/Pages/Search";
const utilityLinks = [
  "Health Checkup & Insurance",
  "Domiciliary Services",
  "Diagnostic Home Services",
];

const primaryLinks = [
  { label: "HOME", href: "/" },
  { label: "ALL DOCTORS", href: "/doctors" },
  { label: "DEPARTMENTS", href: "/departments" },
  { label: "SERVICES", href: "/services" },
  { label: "ABOUT", href: "/about" },
  { label: "CONTACT", href: "/contact" },
];

export default function Header() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dashboardPath, setDashboardPath] = useState("/patient/dashboard");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    function syncAuth() {
      const activePath = getActiveDashboardPath();
      setIsLoggedIn(activePath !== "/login");
      setDashboardPath(activePath);
    }

    syncAuth();
    window.addEventListener("auth-change", syncAuth);
    return () => window.removeEventListener("auth-change", syncAuth);
  }, []);

  function handleLogout() {
    clearAllAuthSessions();
    setIsLoggedIn(false);
    window.dispatchEvent(new Event("auth-change"));
    router.post("/logout");
  }

  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/70 bg-white/90 backdrop-blur-xl">
        <div className="border-b border-brand-strong/20 bg-brand-soft">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-2 text-[13px] text-slate-600 sm:px-6 lg:px-8">
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-1">
              {utilityLinks.map((item) => (
                <Link key={item} href="#" className="transition-colors hover:text-brand">
                  {item}
                </Link>
              ))}
            </nav>
            <nav className="flex items-center gap-6">
              <Link href="#" className="transition-colors hover:text-brand">
                Get the app
              </Link>
              <Link href="#" className="transition-colors hover:text-brand">
                Support
              </Link>
            </nav>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-lg font-semibold text-brand-foreground shadow-lg shadow-brand/25">
              HC
            </span>
            <span className="leading-tight">
              <span className="block text-base font-semibold tracking-wide text-brand">
                Health Care
              </span>
              <span className="block text-xs uppercase tracking-[0.24em] text-slate-500">
                Wellness made simple
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-[15px] font-medium text-slate-700 md:flex">
            {primaryLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="transition-colors hover:text-brand"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search doctors"
              aria-haspopup="dialog"
              aria-expanded={isSearchOpen}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-all hover:border-brand hover:bg-brand-soft hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </button>

            {isLoggedIn ? (
              <>
                <Link
                  href={dashboardPath}
                  className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-red-300"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-brand px-5 py-2.5 text-sm font-semibold text-brand transition-all hover:bg-brand hover:text-brand-foreground"
              >
                <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                Sign up
              </Link>
            )}
          </div>
        </div>
      </header>

      <SearchPage isOpen={isSearchOpen} onClose={closeSearch} />
    </>
  );
}
