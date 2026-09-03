import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import PatientDashboardShell from '@/Components/Patient/patient-dashboard-shell';
import MainLayout from '@/Layouts/MainLayout';

export default function PatientLayout({ children }) {
    const page = usePage();
    const pagePatient = page.props.patient ?? page.props.auth?.user ?? null;
    const [patient, setPatient] = useState(pagePatient);
    const activeTab = resolveActiveTab(page.url);

    useEffect(() => {
        setPatient(pagePatient);
    }, [pagePatient]);

    useEffect(() => {
        function syncPatient() {
            const currentPatient = window.__healthcareAuth?.user;

            if (currentPatient) {
                setPatient(currentPatient);
            }
        }

        window.addEventListener('auth-change', syncPatient);
        return () => window.removeEventListener('auth-change', syncPatient);
    }, []);

    return (
        <MainLayout>
            <PatientDashboardShell patient={patient} activeTab={activeTab}>
                {children}
            </PatientDashboardShell>
        </MainLayout>
    );
}

function resolveActiveTab(url) {
    const pathname = String(url ?? '').split('?')[0];

    if (pathname === '/patient/appointments') return 'appointments';
    if (pathname === '/patient/medical-records') return 'records';
    if (pathname === '/patient/settings') return 'settings';

    return 'dashboard';
}
