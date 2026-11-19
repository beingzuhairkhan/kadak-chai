"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { AdminHeader } from "./components/admin-header";
import { AdminLogin } from "./components/admin-login";
import { AdminSidebar } from "./components/admin-sidebar";
import { useAdminSession } from "./components/use-admin-session";

type Props = { children: React.ReactNode };

function AdminLayoutContent({ children }: Props) {
  const { state, error, logoutError, isLoggingOut, login, logout } =
    useAdminSession();
  const pathname = usePathname();
  const title =
    pathname === "/admin"
      ? "Overview"
      : pathname === "/admin/submissions"
        ? "All Submissions"
        : "Submission Detail";

  if (state === "checking") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f8f1e7] text-[#795b48]">
        Checking admin session…
      </main>
    );
  }
  if (state === "signed-out") {
    return <AdminLogin loading={false} message={error} onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-[#f8f1e7] text-[#2b1a12] lg:flex">
      <AdminSidebar onLogout={() => void logout()} loggingOut={isLoggingOut} />
      <div className="min-w-0 flex-1">
        {logoutError && (
          <p
            role="alert"
            className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800"
          >
            {logoutError}
          </p>
        )}
        <AdminHeader title={title} />
        <main className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: Props) {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#f8f1e7] text-[#795b48]">
          Loading admin…
        </main>
      }
    >
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}
