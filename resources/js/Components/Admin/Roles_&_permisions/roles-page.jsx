"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/utils/api";

const SECTIONS = [
  { key: "roles", title: "Manage Roles", description: "Create, edit, activate, or deactivate roles.", tone: "bg-blue-50 text-blue-700" },
  { key: "permissions", title: "Manage Permissions", description: "Browse available system permissions by module.", tone: "bg-violet-50 text-violet-700" },
  { key: "assignment", title: "Role Permission Assignment", description: "Assign or remove permissions for each role.", tone: "bg-emerald-50 text-emerald-700" },
  { key: "users", title: "User Role Assignment", description: "Assign active roles to platform users.", tone: "bg-amber-50 text-amber-700" },
  { key: "matrix", title: "Permission Matrix", description: "Compare and update roles against permissions.", tone: "bg-cyan-50 text-cyan-700" },
  { key: "summary", title: "Access Summary", description: "Review the effective module access for each role.", tone: "bg-rose-50 text-rose-700" },
];

export default function RolesPage() {
  const [activeSection, setActiveSection] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAccess = useCallback(async () => {
    setIsLoading(true); setError("");
    try {
      const response = await apiFetch("/admin/access-control");
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load roles and permissions.");
      setRoles(result.roles ?? []);
      setPermissions(result.permissions ?? []);
    } catch (requestError) {
      setError(requestError.message || "Could not load roles and permissions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadAccess(); }, [loadAccess]);

  async function savePermissions(roleId, permissionIds) {
    const response = await apiFetch(`/admin/access-control/roles/${roleId}/permissions`, { method: "PUT", body: JSON.stringify({ permission_ids: permissionIds }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(firstError(result) || "Could not update role permissions.");
    setRoles((current) => current.map((role) => role.id === roleId ? result.data : role));
    setNotice(result.message || "Role permissions updated.");
    return result.data;
  }

  const selectedSection = SECTIONS.find((section) => section.key === activeSection);

  return <section className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Access Control</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">Roles & Permissions Management</h1>
      <p className="mt-2 text-sm text-slate-500">Manage persistent role-based access using the platform's existing authorization system.</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600"><span className="rounded-full bg-slate-100 px-3 py-1">{roles.length} roles</span><span className="rounded-full bg-slate-100 px-3 py-1">{permissions.length} permissions</span></div>
    </header>

    {error && !activeSection ? <Alert tone="error">{error}</Alert> : null}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {SECTIONS.map((section, index) => <button key={section.key} type="button" onClick={() => { setActiveSection(section.key); setError(""); setNotice(""); }} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold ${section.tone}`}>{String(index + 1).padStart(2, "0")}</span><h2 className="mt-5 text-lg font-bold text-slate-950">{section.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{section.description}</p><span className="mt-4 inline-flex text-sm font-semibold text-slate-700">Open section →</span></button>)}
    </div>

    {activeSection ? <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[2px]" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveSection(null); }}><aside className="flex h-full w-full max-w-6xl flex-col bg-slate-50 shadow-2xl"><header className="flex items-start justify-between border-b border-slate-200 bg-white px-5 py-5 sm:px-7"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Roles & Permissions</p><h2 className="mt-1 text-2xl font-bold text-slate-950">{selectedSection?.title}</h2><p className="mt-1 text-sm text-slate-500">{selectedSection?.description}</p></div><button type="button" onClick={() => setActiveSection(null)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-xl">×</button></header><div className="flex-1 overflow-y-auto p-4 sm:p-6">{isLoading ? <Empty text="Loading access-control data..." /> : <SectionContent section={activeSection} roles={roles} permissions={permissions} setRoles={setRoles} reload={loadAccess} savePermissions={savePermissions} setError={setError} setNotice={setNotice} />}{error ? <Alert tone="error">{error}</Alert> : null}{notice ? <Alert>{notice}</Alert> : null}</div></aside></div> : null}
  </section>;
}

function SectionContent(props) {
  if (props.section === "roles") return <ManageRoles {...props} />;
  if (props.section === "permissions") return <ManagePermissions {...props} />;
  if (props.section === "assignment") return <RoleAssignment {...props} />;
  if (props.section === "users") return <UserAssignments {...props} />;
  if (props.section === "matrix") return <PermissionMatrix {...props} />;
  return <AccessSummary {...props} />;
}

function ManageRoles({ roles, reload, setError, setNotice }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", is_active: true });
  const [busy, setBusy] = useState(false);

  function edit(role) { setEditingId(role.id); setForm({ name: role.name, is_active: role.isActive }); }
  function reset() { setEditingId(null); setForm({ name: "", is_active: true }); }

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiFetch(editingId ? `/admin/access-control/roles/${editingId}` : "/admin/access-control/roles", { method: editingId ? "PUT" : "POST", body: JSON.stringify(form) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(firstError(result) || "Could not save the role.");
      setNotice(result.message); reset(); await reload();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function remove(role) {
    if (!window.confirm(`Delete the ${role.label} role?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiFetch(`/admin/access-control/roles/${role.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(firstError(result) || "Could not delete the role.");
      setNotice(result.message); await reload();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  return <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]"><div className="space-y-3">{roles.length ? roles.map((role) => <article key={role.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><h3 className="font-bold text-slate-950">{role.label}</h3>{role.isProtected ? <Tag>Protected</Tag> : null}<Status active={role.isActive} /></div><p className="mt-2 text-sm text-slate-500">{role.usersCount} users · {role.permissionIds.length} permissions</p></div><div className="flex gap-2"><button type="button" onClick={() => edit(role)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold">Edit</button>{!role.isProtected ? <button type="button" disabled={busy} onClick={() => void remove(role)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Delete</button> : null}</div></div></article>) : <Empty text="No roles found." />}</div><form onSubmit={submit} className="h-fit rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-950">{editingId ? "Edit role" : "Create role"}</h3><label className="mt-4 block text-sm font-semibold text-slate-700">Role name<input required pattern="[a-z0-9][a-z0-9_-]*" value={form.name} disabled={roles.find((role) => role.id === editingId)?.isProtected} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value.toLowerCase().replace(/\s+/g, "-") }))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" /></label>{editingId ? <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.is_active} disabled={roles.find((role) => role.id === editingId)?.isProtected} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} /> Active role</label> : null}<div className="mt-5 flex gap-2"><button disabled={busy} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Save role"}</button>{editingId ? <button type="button" onClick={reset} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button> : null}</div></form></div>;
}

function ManagePermissions({ permissions }) {
  const [search, setSearch] = useState("");
  const filtered = permissions.filter((permission) => permission.name.toLowerCase().includes(search.toLowerCase()));
  const groups = groupPermissions(filtered);
  return <div className="space-y-5"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search permissions..." className="w-full max-w-md rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm" />{Object.keys(groups).length ? <div className="grid gap-4 md:grid-cols-2">{Object.entries(groups).map(([module, entries]) => <section key={module} className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold capitalize text-slate-950">{label(module)}</h3><div className="mt-3 flex flex-wrap gap-2">{entries.map((permission) => <Tag key={permission.id}>{permission.name}</Tag>)}</div></section>)}</div> : <Empty text="No permissions match your search." />}</div>;
}

function RoleAssignment({ roles, permissions, savePermissions, setError, setNotice }) {
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const role = roles.find((item) => item.id === Number(roleId));
  const [selected, setSelected] = useState(role?.permissionIds ?? []);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setSelected(role?.permissionIds ?? []); }, [roleId, roles]);
  async function save() { setBusy(true); setError(""); setNotice(""); try { await savePermissions(role.id, selected); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } }
  return <div className="space-y-5"><select value={roleId} onChange={(event) => setRoleId(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm">{roles.map((item) => <option key={item.id} value={item.id}>{item.label}{item.isActive ? "" : " (Inactive)"}</option>)}</select>{role ? <><PermissionChecks permissions={permissions} selected={selected} disabled={role.isProtected} onChange={setSelected} /><button type="button" onClick={() => void save()} disabled={busy || role.isProtected} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{role.isProtected ? "Super Admin permissions are protected" : busy ? "Saving..." : "Save permissions"}</button></> : <Empty text="No role selected." />}</div>;
}

function UserAssignments({ roles, setError, setNotice }) {
  const [users, setUsers] = useState([]); const [search, setSearch] = useState(""); const [roleFilter, setRoleFilter] = useState(""); const [page, setPage] = useState(1); const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 }); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState("");
  const loadUsers = useCallback(async (signal) => { setLoading(true); try { const params = new URLSearchParams({ page: String(page), per_page: "20" }); if (search.trim()) params.set("search", search.trim()); if (roleFilter) params.set("role_id", roleFilter); const response = await apiFetch(`/admin/access-control/users?${params}`, { signal }); const result = await response.json().catch(() => ({})); if (!response.ok || !result.success) throw new Error(result.message || "Could not load users."); setUsers(result.data ?? []); setMeta(result.meta ?? { current_page: 1, last_page: 1, total: 0 }); } catch (requestError) { if (requestError.name !== "AbortError") setError(requestError.message); } finally { if (!signal?.aborted) setLoading(false); } }, [page, roleFilter, search, setError]);
  useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => void loadUsers(controller.signal), 250); return () => { window.clearTimeout(timer); controller.abort(); }; }, [loadUsers]);
  async function save(user, roleIds) { setBusy(String(user.id)); setError(""); setNotice(""); try { const response = await apiFetch(`/admin/access-control/users/${user.id}/roles`, { method: "PUT", body: JSON.stringify({ role_ids: roleIds }) }); const result = await response.json().catch(() => ({})); if (!response.ok || !result.success) throw new Error(firstError(result) || "Could not update user roles."); setNotice(result.message); await loadUsers(); } catch (requestError) { setError(requestError.message); } finally { setBusy(""); } }
  return <div className="space-y-5"><div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row"><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, email, or username" className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" /><select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">All roles</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}</select></div>{loading ? <Empty text="Loading users..." /> : users.length ? <div className="space-y-3">{users.map((user) => <UserRoleCard key={user.id} user={user} roles={roles} busy={busy === String(user.id)} onSave={save} />)}</div> : <Empty text="No users found." />}<Pagination meta={meta} page={page} setPage={setPage} loading={loading} /></div>;
}

function UserRoleCard({ user, roles, busy, onSave }) {
  const [selected, setSelected] = useState(user.roles.map((role) => role.id));
  useEffect(() => { setSelected(user.roles.map((role) => role.id)); }, [user]);
  function toggle(id) { setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }
  return <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="font-bold text-slate-950">{user.name}</h3><p className="mt-1 text-sm text-slate-500">{user.email} · {label(user.status || "active")}</p></div><div className="flex flex-wrap gap-3">{roles.filter((role) => role.isActive).map((role) => <label key={role.id} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={selected.includes(role.id)} onChange={() => toggle(role.id)} /> {role.label}</label>)}</div><button type="button" disabled={busy || selected.length === 0} onClick={() => void onSave(user, selected)} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Saving..." : "Save"}</button></div></article>;
}

function PermissionMatrix({ roles, permissions, savePermissions, setError, setNotice }) {
  const [matrix, setMatrix] = useState(() => Object.fromEntries(roles.map((role) => [role.id, role.permissionIds]))); const [busy, setBusy] = useState(false);
  useEffect(() => { setMatrix(Object.fromEntries(roles.map((role) => [role.id, role.permissionIds]))); }, [roles]);
  function toggle(role, permissionId) { if (role.isProtected) return; setMatrix((current) => { const values = current[role.id] ?? []; return { ...current, [role.id]: values.includes(permissionId) ? values.filter((id) => id !== permissionId) : [...values, permissionId] }; }); }
  async function save() { setBusy(true); setError(""); setNotice(""); try { for (const role of roles.filter((item) => !item.isProtected)) await savePermissions(role.id, matrix[role.id] ?? []); setNotice("Permission matrix saved successfully."); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } }
  return <div className="space-y-4"><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100"><tr><th className="sticky left-0 bg-slate-100 px-4 py-3 font-bold">Permission</th>{roles.map((role) => <th key={role.id} className="min-w-32 px-4 py-3 text-center font-bold">{role.label}</th>)}</tr></thead><tbody>{permissions.map((permission) => <tr key={permission.id} className="border-t border-slate-100"><td className="sticky left-0 bg-white px-4 py-3 font-medium">{permission.name}</td>{roles.map((role) => <td key={role.id} className="px-4 py-3 text-center"><input type="checkbox" aria-label={`${role.label}: ${permission.name}`} checked={(matrix[role.id] ?? []).includes(permission.id)} disabled={role.isProtected} onChange={() => toggle(role, permission.id)} /></td>)}</tr>)}</tbody></table></div><button type="button" onClick={() => void save()} disabled={busy} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Saving matrix..." : "Save matrix changes"}</button></div>;
}

function AccessSummary({ roles, permissions }) {
  return roles.length ? <div className="grid gap-4 lg:grid-cols-2">{roles.map((role) => { const granted = permissions.filter((permission) => role.permissionIds.includes(permission.id)); const groups = groupPermissions(granted); return <article key={role.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><h3 className="font-bold text-slate-950">{role.label}</h3><Status active={role.isActive} /></div><p className="mt-2 text-sm text-slate-500">{role.usersCount} assigned users · {granted.length} permissions</p><div className="mt-4 space-y-3">{Object.entries(groups).map(([module, entries]) => <div key={module}><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label(module)}</p><p className="mt-1 text-sm text-slate-700">{entries.map((permission) => label(permission.action)).join(", ")}</p></div>)}</div></article>; })}</div> : <Empty text="No roles found." />;
}

function PermissionChecks({ permissions, selected, disabled, onChange }) { const groups = groupPermissions(permissions); function toggle(id) { onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]); } return <div className="grid gap-4 md:grid-cols-2">{Object.entries(groups).map(([module, entries]) => <section key={module} className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-950">{label(module)}</h3><div className="mt-3 space-y-2">{entries.map((permission) => <label key={permission.id} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={selected.includes(permission.id)} disabled={disabled} onChange={() => toggle(permission.id)} /> {permission.name}</label>)}</div></section>)}</div>; }
function Pagination({ meta, page, setPage, loading }) { return <div className="flex items-center justify-between text-sm text-slate-500"><span>{meta.total} users · Page {meta.current_page} of {meta.last_page}</span><div className="flex gap-2"><PageButton disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</PageButton><PageButton disabled={page >= meta.last_page || loading} onClick={() => setPage((value) => value + 1)}>Next</PageButton></div></div>; }
function groupPermissions(permissions) { return permissions.reduce((groups, permission) => ({ ...groups, [permission.module]: [...(groups[permission.module] ?? []), permission] }), {}); }
function firstError(result) { return Object.values(result.errors ?? {}).flat()[0] || result.message; }
function label(value) { return String(value ?? "").replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function Status({ active }) { return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{active ? "Active" : "Inactive"}</span>; }
function Tag({ children }) { return <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">{children}</span>; }
function Empty({ text }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{text}</div>; }
function Alert({ children, tone = "success" }) { return <p className={`mt-4 rounded-xl border p-4 text-sm ${tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{children}</p>; }
function PageButton({ children, ...props }) { return <button type="button" {...props} className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 disabled:opacity-40">{children}</button>; }
