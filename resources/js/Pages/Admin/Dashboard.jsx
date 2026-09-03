import { Suspense } from "react";
import AdminDashboard from "@/Components/Admin/Dashboard_Overview/AdminDashboard";
import AdminLayout from "@/Layouts/AdminLayout";

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white px-4 text-sm font-medium text-slate-500">
          Loading admin dashboard...
        </main>
      }
    >
      <AdminDashboard />
    </Suspense>
  );
}

AdminDashboardPage.layout = (page) => <AdminLayout>{page}</AdminLayout>;
