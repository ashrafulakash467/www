"use client";

import { useEffect, useState } from "react";

const SIDEBAR_TOGGLE_EVENT = "dashboard-sidebar-toggle";

export default function SidebarShell({
  title,
  subtitle,
  roleLabel,
  items = [],
  activeKey,
  onItemClick,
  isItemActive,
  renderIcon,
  user,
  onLogout,
  className = "",
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState([]);

  useEffect(() => {
    function syncCollapsedState() {
      setIsCollapsed(window.innerWidth < 768);
    }

    function handleToggle() {
      if (window.innerWidth < 768) {
        return;
      }

      setIsCollapsed((current) => !current);
    }

    syncCollapsedState();
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, handleToggle);
    window.addEventListener("resize", syncCollapsedState);

    return () => {
      window.removeEventListener(SIDEBAR_TOGGLE_EVENT, handleToggle);
      window.removeEventListener("resize", syncCollapsedState);
    };
  }, []);

  function getIsActive(item) {
    if (typeof isItemActive === "function") {
      return Boolean(isItemActive(item));
    }

    return item.key === activeKey;
  }

  function getInitial() {
    const source = user?.name || roleLabel || "U";
    return source.trim().charAt(0).toUpperCase();
  }

  function hasActiveChild(item) {
    return item.children?.some((child) => child.key === activeKey || hasActiveChild(child));
  }

  function renderItem(item, depth = 0) {
    const active = getIsActive(item) || hasActiveChild(item);
    const expanded = expandedKeys.includes(item.key);

    return (
      <div key={item.key}>
        <button
          type="button"
          onClick={() => {
            if (item.children?.length) {
              setExpandedKeys((current) => current.includes(item.key)
                ? current.filter((key) => key !== item.key)
                : [...current, item.key]);
            }
            onItemClick?.(item);
          }}
          title={isCollapsed ? item.label : undefined}
          className={[
            "group flex w-full items-center gap-3 rounded-2xl text-left text-sm font-semibold transition",
            isCollapsed ? "justify-center px-2 py-3" : depth ? "px-4 py-2.5 pl-12" : "px-4 py-3",
            active && !depth ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10" : active ? "bg-slate-100 text-slate-950" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
          ].join(" ")}
        >
          {depth === 0 ? <span className={["flex h-9 w-9 flex-none items-center justify-center rounded-xl transition", active ? "bg-white/10 text-white" : "bg-slate-50 text-slate-500 group-hover:bg-white group-hover:text-slate-900"].join(" ")}>{renderIcon ? renderIcon(item, active) : null}</span> : null}
          {!isCollapsed ? <span className="truncate">{item.label}</span> : null}
          {!isCollapsed && item.children?.length ? <span className="ml-auto text-xs">{expanded ? "-" : "+"}</span> : null}
        </button>
        {!isCollapsed && expanded && item.children?.length ? <div className="mt-1 space-y-1">{item.children.map((child) => renderItem(child, depth + 1))}</div> : null}
      </div>
    );
  }

  return (
    <aside
      className={[
        "flex h-full shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white/95 px-4 py-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur transition-all duration-300 md:px-4 md:py-4",
        isCollapsed ? "w-30" : "w-20 sm:w-24 md:w-72 lg:w-80",
        className,
      ].join(" ")}
    >
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-2">
          {items.map((item) => renderItem(item))}
        </div>
      </nav>

      {!isCollapsed && (user || onLogout) ? (
        <div className="border-t border-slate-100 pt-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {roleLabel ?? "Signed in as"}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 font-bold text-white">
                {getInitial()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950">
                  {user?.name ?? roleLabel ?? "Team member"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {user?.email ?? "No email available"}
                </p>
              </div>
            </div>

            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-red-100"
              >
                Sign out
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
