import { Head, Link } from '@inertiajs/react';
import DoctorCardDetails from '@/Components/shared/DoctorCardDetails';

export default function DoctorShow({ doctor }) {
    return (
        <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
            <Head title={doctor.name} />
            <DoctorCardDetails doctor={doctor} />
            <div className="mt-6 flex flex-wrap gap-3">
                <Link
                    href={`/appointment/book?doctorId=${doctor.id}`}
                    className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-hover"
                >
                    Book appointment
                </Link>
                <Link href="/doctors" className="rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-brand">
                    Back to doctors
                </Link>
            </div>
        </main>
    );
}

