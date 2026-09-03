"use client";

/**
 * Fully dynamic Admin Settings.
 *
 * Every setting shown here is stored in the database via the Laravel API
 * (apps/laravel-api). Saving a value or toggling a setting sends the change
 * to the backend and broadcasts a `settings-changed` event so the public
 * header, footer, auth page, and dynamic policy pages update immediately.
 */
import { useEffect, useMemo, useState } from "react";

const GROUP_LABELS = {
  system: "Settings & Privacy",
  brand: "Logo & Image",
  social: "Social Media",
  contact: "Contact",
  map: "Maps & Location",
  policy: "Policies",
  tracking: "Server-Side Tracking",
  auth: "Login Options",
  general: "General",
};

function groupLabel(group) {
  return GROUP_LABELS[group] ?? group ?? "General";
}

export default function SettingsPage({
  settings = [],
  loading = false,
  onSaveSetting,
  onToggleSetting,
  onAddSetting,
  onDeleteSetting,
  onUploadImage,
  onRefresh,
}) {
  const [dirtyMap, setDirtyMap] = useState({});
  const [activeSection, setActiveSection] = useState("main");
  const [notice, setNotice] = useState(null);

  function showNotice(message, tone = "success") {
    setNotice({ message, tone });
    window.setTimeout(() => setNotice(null), 2600);
  }

  async function handleSaveSetting(setting, patch) {
    if (!onSaveSetting) {
      return;
    }

    setDirtyMap((current) => ({ ...current, [setting.id]: true }));
    const ok = await onSaveSetting(setting, patch);
    setDirtyMap((current) => ({ ...current, [setting.id]: false }));
    return ok;
  }

  const normalizedSettings = useMemo(() => {
    if (Array.isArray(settings)) {
      return settings;
    }

    if (!settings || typeof settings !== "object") {
      return [];
    }

    return Object.entries(settings).map(([key, value]) => ({
      id: `legacy-${key}`,
      key,
      label: key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()),
      group: "system",
      type: "boolean",
      value: Boolean(value),
      castValue: Boolean(value),
      isActive: true,
    }));
  }, [settings]);

  async function handleToggleSetting(setting) {
    if (!onToggleSetting) {
      return;
    }

    return onToggleSetting(Array.isArray(settings) ? setting : setting.key);
  }

  const byGroup = useMemo(() => {
    const groups = {};
    for (const setting of normalizedSettings) {
      const name = setting.group || "general";
      if (!groups[name]) {
        groups[name] = [];
      }
      groups[name].push(setting);
    }
    return groups;
  }, [normalizedSettings]);

  const sections = [
    {
      id: "main",
      label: "Main Settings",
      description:
        "Logo & Image, Social Media & Contact, Maps & Location, and Settings & Privacy.",
    },
    {
      id: "policy",
      label: "Return & Refund Policy",
      description: "Policy title, slug, content, and visibility.",
    },
    {
      id: "tracking",
      label: "Server-Side Tracking",
      description: "Google Analytics / Tag Manager and the Meta (Facebook) Pixel.",
    },
    {
      id: "auth",
      label: "Authentication Options",
      description: "Toggle which social login providers are available.",
    },
    {
      id: "advanced",
      label: "All Settings",
      description: "Add, edit, enable, disable, or delete any setting.",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <nav className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveSection(section.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeSection === section.id
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {section.label}
          </button>
        ))}
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="ml-auto rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            ↻ Refresh
          </button>
        ) : null}
      </nav>

      {notice ? (
        <p
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            notice.tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
          role="status"
        >
          {notice.message}
        </p>
      ) : null}

      {loading ? (
        <Panel eyebrow="Settings" title="Loading" description="">
          <div className="flex items-center justify-center py-16 text-sm font-medium text-slate-500">
            Loading settings from the server…
          </div>
        </Panel>
      ) : null}
{!loading && activeSection === "main" ? (
        <MainSettingsSection
          groups={byGroup}
          dirtyMap={dirtyMap}
          onSaveSetting={handleSaveSetting}
          onToggleSetting={handleToggleSetting}
          onUploadImage={onUploadImage}
          onNotice={showNotice}
        />
      ) : null}

      {!loading && activeSection === "policy" ? (
        <Panel
          eyebrow="Main Settings"
          title="Return & Refund Policy"
          description="Manage the policy pages published to the public footer. Each policy renders on its own dynamic /page/{slug} route."
        >
          <div className="space-y-4">
            <PolicyFields
              groups={byGroup}
              names={[
                "return_refund",
                "cancellation_refund",
                "no_show",
                "privacy",
                "terms",
                "account_deletion",
              ]}
              dirtyMap={dirtyMap}
              onSaveSetting={handleSaveSetting}
              onToggleSetting={handleToggleSetting}
              onNotice={showNotice}
            />
          </div>
        </Panel>
      ) : null}

      {!loading && activeSection === "tracking" ? (
        <TrackingSection
          settings={byGroup.tracking ?? []}
          dirtyMap={dirtyMap}
          onSaveSetting={handleSaveSetting}
          onToggleSetting={handleToggleSetting}
        />
      ) : null}

      {!loading && activeSection === "auth" ? (
        <AuthSection
          settings={byGroup.auth ?? []}
          dirtyMap={dirtyMap}
          onSaveSetting={handleSaveSetting}
          onToggleSetting={handleToggleSetting}
        />
      ) : null}

      {!loading && activeSection === "advanced" ? (
        <AdvancedSection
          settings={normalizedSettings}
          byGroup={byGroup}
          dirtyMap={dirtyMap}
          onSaveSetting={handleSaveSetting}
          onToggleSetting={handleToggleSetting}
          onAddSetting={onAddSetting}
          onDeleteSetting={onDeleteSetting}
          onUploadImage={onUploadImage}
          onNotice={showNotice}
        />
      ) : null}
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* Shared building blocks                                              */
/* ------------------------------------------------------------------ */

function Panel({ eyebrow = "System Settings", title = "Settings", description = "", children }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}

function ToggleSwitch({ enabled, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        enabled ? "bg-emerald-500" : "bg-slate-300"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SettingField({ setting, dirty, onSave, onToggle, onUploadImage }) {
  const [value, setValue] = useState(setting?.value ?? "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!saved) return undefined;
    const timer = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(timer);
  }, [saved]);

  if (!setting) return null;

  const isBoolean = setting.type === "boolean";

  async function commit() {
    if (isBoolean) {
      if (onToggle) await onToggle(setting);
      return;
    }

    const next = String(value ?? "").trim();
    if (setting.type === "url" && next && !/^https?:\/\//i.test(next)) {
      setError("Must be a valid http(s) URL.");
      return;
    }
    if (next === (setting.value ?? "")) return;

    setSaving(true);
    setError("");
    const ok = await onSave(setting, { value: next });
    setSaving(false);
    if (ok !== false) setSaved(true);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold text-slate-950">{setting.label}</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500">
              {setting.key}
            </span>
          </div>
          {setting.hint ? <p className="mt-1 text-xs leading-5 text-slate-500">{setting.hint}</p> : null}
        </div>
        <ToggleSwitch enabled={setting.isActive} onChange={() => onToggle(setting)} />
      </div>

      <div className="mt-4">
        {isBoolean ? (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <ToggleSwitch enabled={Boolean(setting.castValue ?? setting.value)} onChange={() => void commit()} disabled={saving} />
            <span className="text-sm font-semibold text-slate-700">
              {Boolean(setting.castValue ?? setting.value) ? "Enabled" : "Disabled"}
            </span>
          </div>
        ) : setting.type === "textarea" ? (
          <textarea value={value} onChange={(event) => { setValue(event.target.value); setError(""); }} rows={5} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft" />
        ) : setting.type === "image" ? (
          <ImageField setting={setting} onUploadImage={onUploadImage} onClear={() => onSave(setting, { value: "" })} />
        ) : (
          <input type="text" value={value} onChange={(event) => { setValue(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") void commit(); }} className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft" />
        )}

        {error ? <p className="mt-2 text-xs font-medium text-rose-600">{error}</p> : null}
        {!isBoolean && setting.type !== "image" ? (
          <div className="mt-3 flex items-center justify-end gap-3">
            {saving ? <span className="text-xs font-medium text-slate-400">Saving…</span> : saved ? <span className="text-xs font-semibold text-emerald-600">Saved ✓</span> : dirty ? <span className="text-xs font-medium text-amber-600">Changed</span> : null}
            <button type="button" onClick={() => void commit()} disabled={saving || value === (setting.value ?? "")} className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Save</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ImageField({ setting, onUploadImage, onClear }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const preview = setting.castValue || setting.value || "";

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    setError("");
    try {
      await onUploadImage(setting, file);
    } catch {
      setError("Upload failed. Please try a different image.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {preview ? (
        // Settings may contain externally hosted image URLs.
        <img
          src={preview}
          alt={setting.label}
          className="h-16 w-16 rounded-xl border border-slate-200 bg-slate-50 object-contain p-1"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-[10px] font-semibold text-slate-400">
          No image
        </div>
      )}

      <label className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
        {uploading ? "Uploading…" : "Upload image"}
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>

      {preview ? (
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
        >
          Remove
        </button>
      ) : null}

      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Settings (logo, social, contact, map, privacy)                 */
/* ------------------------------------------------------------------ */

function MainSettingsSection({ groups, dirtyMap, onSaveSetting, onToggleSetting, onUploadImage }) {
  const subsections = [
    { id: "system", title: "Settings & Privacy", description: "Platform-wide behavior and security toggles." },
    { id: "brand", title: "Logo & Image", description: "Site name, logo, favicon, and brand description." },
    { id: "social", title: "Social Media", description: "Public social profiles. Empty URLs hide the icons." },
    { id: "contact", title: "Contact", description: "Phone, hotline, email, and address shown on the site." },
    { id: "map", title: "Maps & Location", description: "Map embed, coordinates, and directions link." },
  ];

  return (
    <Panel
      eyebrow="Main Settings"
      title="Main Settings"
      description="Inline settings sections for branding, contact, location, and privacy."
    >
      <div className="space-y-6">
        {subsections.map((section) => {
          const items =
            section.id === "social"
              ? [...(groups.social ?? []), ...(groups.contact ?? [])]
              : (groups[section.id] ?? []);

          if (items.length === 0) {
            return null;
          }

          return (
            <Subsection key={section.id} title={section.title} description={section.description}>
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((setting) => (
                  <SettingField
                    key={`${setting.id}-${setting.value ?? ""}`}
                    setting={setting}
                    dirty={dirtyMap[setting.id]}
                    onSave={onSaveSetting}
                    onToggle={onToggleSetting}
                    onUploadImage={onUploadImage}
                  />
                ))}
              </div>
            </Subsection>
          );
        })}
      </div>
    </Panel>
  );
}

function Subsection({ title, description, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function SettingsGrid({ title, description, settings, dirtyMap, onSaveSetting, onToggleSetting, onUploadImage }) {
  return (
    <Panel eyebrow="Settings" title={title} description={description}>
      {settings.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {settings.map((setting) => (
            <SettingField
              key={setting.id}
              setting={setting}
              dirty={dirtyMap[setting.id]}
              onSave={onSaveSetting}
              onToggle={onToggleSetting}
              onUploadImage={onUploadImage}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No settings found.</p>
      )}
    </Panel>
  );
}

function TrackingSection({ settings, dirtyMap, onSaveSetting, onToggleSetting }) {
  return (
    <SettingsGrid
      title="Server-Side Tracking"
      description="Manage analytics and conversion tracking settings."
      settings={settings}
      dirtyMap={dirtyMap}
      onSaveSetting={onSaveSetting}
      onToggleSetting={onToggleSetting}
    />
  );
}

function AuthSection({ settings, dirtyMap, onSaveSetting, onToggleSetting }) {
  return (
    <SettingsGrid
      title="Authentication Options"
      description="Choose which authentication providers are available."
      settings={settings}
      dirtyMap={dirtyMap}
      onSaveSetting={onSaveSetting}
      onToggleSetting={onToggleSetting}
    />
  );
}

function AdvancedSection({ settings, byGroup, dirtyMap, onSaveSetting, onToggleSetting, onUploadImage }) {
  return (
    <Panel eyebrow="Advanced" title="All Settings" description="Manage every setting grouped by category.">
      <div className="space-y-6">
        {Object.entries(byGroup).map(([group, groupSettings]) => (
          <Subsection key={group} title={groupLabel(group)} description={`${groupSettings.length} setting${groupSettings.length === 1 ? "" : "s"}`}>
            <div className="grid gap-4 lg:grid-cols-2">
              {groupSettings.map((setting) => (
                <SettingField
                  key={setting.id}
                  setting={setting}
                  dirty={dirtyMap[setting.id]}
                  onSave={onSaveSetting}
                  onToggle={onToggleSetting}
                  onUploadImage={onUploadImage}
                />
              ))}
            </div>
          </Subsection>
        ))}
        {!settings.length ? <p className="text-sm text-slate-500">No settings found.</p> : null}
      </div>
    </Panel>
  );
}

function CompactField({ setting, label, textarea = false, onSave }) {
  const [value, setValue] = useState(setting.value ?? "");

  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => void onSave(setting, { value })}
          rows={4}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => void onSave(setting, { value })}
          className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
        />
      )}
    </label>
  );
}
/* ------------------------------------------------------------------ */
/* Return & Refund / policy pages                                      */
/* ------------------------------------------------------------------ */

function PolicyFields({
  groups,
  names,
  onSaveSetting,
  onToggleSetting,
}) {
  const policySettings = groups.policy ?? [];

  if (policySettings.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No policy settings found. Run the SettingsSeeder to create the defaults.
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {names.map((name) => {
        const title = policySettings.find((s) => s.key === `policy:${name}_title`);
        const enabled = policySettings.find((s) => s.key === `policy:${name}_enabled`);
        const content = policySettings.find((s) => s.key === `policy:${name}_content`);

        if (!title || !enabled || !content) {
          return null;
        }

        return (
          <div key={name} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-bold text-slate-950">{title.value || "Policy"}</p>
                <p className="mt-0.5 font-mono text-[10px] text-slate-400">Policy setting</p>
              </div>
              <ToggleSwitch
                enabled={Boolean(enabled.castValue ?? enabled.value)}
                onChange={() => onToggleSetting(enabled)}
              />
            </div>

            <div className="space-y-3">
              <CompactField setting={title} label="Title" onSave={onSaveSetting} />
              <CompactField setting={content} label="Content" textarea onSave={onSaveSetting} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
