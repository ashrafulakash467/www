import { Suspense } from "react";
import DoctorDashboardClient from "@/Components/Doctor/Dashboard";
import DoctorLayout from "@/Layouts/DoctorLayout";

export default function DoctorDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white px-4 text-sm font-medium text-slate-500">
          Loading doctor dashboard...
        </main>
      }
    >
      <DoctorDashboardClient />
    </Suspense>
  );
}

DoctorDashboardPage.layout = (page) => <DoctorLayout>{page}</DoctorLayout>;
