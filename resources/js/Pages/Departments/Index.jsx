import { Head, Link } from '@inertiajs/react';

export default function DepartmentsIndex({ departments = [] }) {
    return (
        <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <Head title="Departments" />
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">Medical departments</p>
            <h1 className="mt-3 text-4xl font-extrabold text-slate-950">Find care by specialty</h1>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {departments.map((department) => (
                    <Link
                        key={department.name}
                        href={`/doctors?specialty=${encodeURIComponent(department.name)}`}
                        className="rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-soft"
                    >
                        <h2 className="text-lg font-bold text-slate-950">{department.name}</h2>
                        <p className="mt-2 text-sm text-slate-600">{department.doctors_count} available doctor(s)</p>
                    </Link>
                ))}
            </div>
            {departments.length === 0 ? <p className="mt-8 rounded-xl bg-muted p-5 text-muted-foreground">Departments will appear after doctors are approved.</p> : null}
        </main>
    );
}

