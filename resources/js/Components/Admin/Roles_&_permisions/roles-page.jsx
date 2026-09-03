"use client";

export default function RolesPage({ roles }) {
  return (
    <PanelCard
      eyebrow="Roles & Permissions"
      title="Roles"
      description="RBAC groups and allowed actions for each admin role."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {roles.map((item) => (
          <div
            key={item.role}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-base font-bold text-slate-950">{item.role}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.permissions.map((permission) => (
                <Tag key={permission}>{permission}</Tag>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function PanelCard({ eyebrow, title, description, children }) {
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
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Tag({ children }) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
      {children}
    </span>
  );
}
