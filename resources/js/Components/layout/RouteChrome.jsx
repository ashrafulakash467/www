"use client";

import { usePathname } from "@/utils/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function RouteChrome({ children }) {
  const pathname = usePathname();

  const hideChrome =
    pathname.startsWith("/doctor/dashboard") ||
    pathname.startsWith("/admin/dashboard");

  if (hideChrome) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <div className="pt-30 sm:pt-32.5 ">{children}</div>
      <Footer />
    </>
  );
}