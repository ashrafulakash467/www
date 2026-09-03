import { Head } from '@inertiajs/react';

const services = [
    ['Doctor appointments', 'Browse verified doctors and reserve an available time slot.'],
    ['Patient records', 'Keep consultation notes, prescriptions, and documents connected to care.'],
    ['Secure payments', 'Pay appointment fees through the separated payment workflow.'],
    ['Schedule management', 'Doctors can manage availability and respond to appointment requests.'],
];

export default function ServicesIndex() {
    return (
        <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <Head title="Services" />
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">Healthcare services</p>
            <h1 className="mt-3 text-4xl font-extrabold text-slate-950">Care coordinated in one place</h1>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
                {services.map(([title, description]) => (
                    <article key={title} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
                        <p className="mt-3 leading-7 text-slate-600">{description}</p>
                    </article>
                ))}
            </div>
        </main>
    );
}

