"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Rows3 } from "lucide-react";

type Props = { onLogout: () => void; loggingOut?: boolean };

export function AdminSidebar({ onLogout, loggingOut = false }: Props) {
  const pathname = usePathname();
  const links = [
    {
      label: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
      active: pathname === "/admin",
    },
    {
      label: "All Submissions",
      href: "/admin/submissions",
      icon: Rows3,
      active: pathname.startsWith("/admin/submissions"),
    },
  ];

  return (
    <aside className="shrink-0 border-b border-[#ead9c6] bg-white px-4 py-3 lg:min-h-screen lg:w-56 lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
      <a
        href="/admin"
        className="hidden items-center gap-3 border-b border-[#ead9c6] pb-6 font-bold text-[#2b1a12] lg:flex"
      >
        <span className="grid size-9 place-items-center rounded-full bg-[#f4e7c9] text-sm font-black text-[#8d4b2d]">
          K
        </span>
        Kadak Chai
      </a>
      <nav className="flex items-center gap-2 lg:mt-6 lg:block lg:space-y-1">
        {links.map(({ label, href, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold lg:gap-3 lg:py-3 lg:text-[13px] ${active ? "bg-[#f4e7c9] text-[#8d4b2d]" : "text-[#795b48] hover:bg-[#fcf8f2]"}`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="ml-auto flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-[#795b48] hover:bg-[#fcf8f2] disabled:cursor-wait disabled:opacity-60 lg:ml-0 lg:mt-6 lg:w-full lg:border-t lg:border-[#ead9c6] lg:pt-5 lg:text-[13px]"
        >
          <LogOut size={16} />
          {loggingOut ? "Logging out…" : "Logout"}
        </button>
      </nav>
    </aside>
  );
}
