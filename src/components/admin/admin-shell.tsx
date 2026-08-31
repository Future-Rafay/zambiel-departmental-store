"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Archive,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  Download,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  Boxes,
  CreditCard,
  FolderTree,
  Users,
  X,
  Zap,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { siteConfig } from "@/config/site";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "OWNER" | "STAFF";
};

export function AdminShell({ user, children, staffApkUrl }: { user: AdminUser; children: ReactNode; staffApkUrl?: string }) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setUserDropdownOpen(false);
    await signOut({ callbackUrl: "/admin/login" });
  }

  const isOwner = user.role === "OWNER";

  const navGroups = [
    {
      title: "Operations",
      items: [
        { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="h-4 w-4" /> },
        { label: "Order Queue", href: "/admin/orders/live", icon: <Zap className="h-4 w-4" /> },
        { label: "Orders", href: "/admin/orders", icon: <ShoppingBag className="h-4 w-4" /> },
        { label: "Inventory", href: "/admin/inventory", icon: <Boxes className="h-4 w-4" /> },
      ],
    },
    ...(isOwner
      ? [
          {
            title: "Store Management",
            items: [
              { label: "Products", href: "/admin/products", icon: <Archive className="h-4 w-4" /> },
              { label: "Categories", href: "/admin/categories", icon: <FolderTree className="h-4 w-4" /> },
              { label: "Delivery Zones", href: "/admin/settings/delivery-zones", icon: <Truck className="h-4 w-4" /> },
              { label: "Discounts", href: "/admin/discounts", icon: <Tag className="h-4 w-4" /> },
              { label: "Payments", href: "/admin/payments", icon: <CreditCard className="h-4 w-4" /> },
            ],
          },
          {
            title: "Administration",
            items: [
              { label: "Staff Accounts", href: "/admin/staff", icon: <Users className="h-4 w-4" /> },
              { label: "Customers", href: "/admin/customers", icon: <Users className="h-4 w-4" /> },
              { label: "Settings", href: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
              { label: "Audit Logs", href: "/admin/audit", icon: <ClipboardList className="h-4 w-4" /> },
            ],
          },
        ]
      : []),
  ];

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/orders") return pathname === "/admin/orders" || /^\/admin\/orders\/(?:ZAM|SNP)-/i.test(pathname ?? "");
    return pathname?.startsWith(href);
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Skip Link */}
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
        href="#admin-main"
      >
        Skip to admin content
      </a>

      <div className="flex min-h-dvh">
        {/* SIDEBAR - DESKTOP */}
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface-warm lg:flex lg:flex-col justify-between">
          <div className="p-4 space-y-6">
            {/* Brand Box */}
            <div className="flex items-center justify-between px-2 py-1">
              <BrandLogo className="h-8 w-36" />
              <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary uppercase">
                {user.role}
              </span>
            </div>

            {/* Navigation Sections */}
            <nav className="space-y-5">
              {navGroups.map((group) => (
                <div key={group.title} className="space-y-1">
                  <p className="px-3 text-[11px] font-bold text-muted uppercase tracking-wider">
                    {group.title}
                  </p>
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                          active
                            ? "bg-white text-primary shadow-xs border border-border/50"
                            : "text-[#4A4A4A] hover:bg-black/5 hover:text-foreground"
                        }`}
                      >
                        <span className={active ? "text-primary" : "text-muted"}>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>

          {/* Sidebar Footer Link */}
          <div className="border-t border-border p-4">
            <Link
              href={`/${siteConfig.locale}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg bg-white p-2.5 text-xs font-bold text-primary shadow-xs border border-border/60 hover:bg-primary/5 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-secondary" />
                View Public Website
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-muted" />
            </Link>
          </div>
        </aside>

        {/* MAIN AREA */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* TOP APP BAR */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 shadow-xs sm:px-6">
            
            {/* Left: Mobile hamburger & title */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground hover:bg-surface-warm lg:hidden"
                aria-label="Toggle admin sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-primary hidden sm:block" />
                <span className="font-display text-lg text-primary">Zambiel Admin</span>
                <span className="hidden sm:inline-block text-xs text-muted">/ Control Center</span>
              </div>
            </div>

            {/* Right Action Cluster */}
            <div className="flex items-center gap-3">
              <div className="group relative hidden sm:block">
                {staffApkUrl ? <a href={staffApkUrl} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border/80 bg-surface-warm/70 px-3 text-xs font-bold text-primary transition-all hover:border-secondary hover:bg-surface-warm" aria-describedby="apk-download-help"><Download aria-hidden="true" className="h-3.5 w-3.5" /><span>Download staff app</span></a> : <button type="button" disabled className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border/80 bg-surface-warm/70 px-3 text-xs font-bold text-muted"><Download aria-hidden="true" className="h-3.5 w-3.5" /><span>Staff app unavailable</span></button>}
                <span id="apk-download-help" role="tooltip" className="pointer-events-none absolute right-0 top-12 z-50 hidden w-64 rounded-lg bg-[#202223] p-3 text-xs font-medium leading-5 text-white shadow-xl group-hover:block group-focus-within:block">{staffApkUrl ? "Downloads the signed Zambiel staff Android app." : "A signed production APK has not been published yet."}</span>
              </div>

              {/* FAR-RIGHT USER PROFILE DROPDOWN */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 rounded-full border border-border bg-surface p-1 pr-3 hover:border-secondary transition-all focus:outline-none"
                  aria-expanded={userDropdownOpen}
                  aria-label="Admin User Menu"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : "A"}
                  </div>
                  <span className="hidden md:inline-block text-xs font-bold text-foreground">
                    {user.name}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-border bg-white p-2 shadow-xl animate-scale-in">
                    <div className="rounded-lg bg-surface-warm p-3 space-y-1">
                      <p className="font-display text-sm font-bold text-primary truncate">{user.name}</p>
                      <p className="text-xs text-muted truncate">{user.email}</p>
                      <span className="inline-flex items-center gap-1 rounded bg-secondary/20 px-2 py-0.5 text-[10px] font-bold text-secondary-light">
                        <ShieldCheck className="h-3 w-3" />
                        {user.role} ACCOUNT
                      </span>
                    </div>

                    <div className="my-2 border-t border-border/60" />

                    <div className="space-y-1">
                      <Link
                        href={`/${siteConfig.locale}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-surface-warm transition-colors"
                      >
                        <Globe className="h-4 w-4 text-secondary" />
                        <span>View Live Website</span>
                        <ExternalLink className="h-3 w-3 text-muted ml-auto" />
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* MOBILE SIDEBAR DRAWER */}
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <div className="relative flex w-72 max-w-full flex-col bg-surface-warm p-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="font-display text-primary">Zambiel Admin Menu</span>
                  <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="rounded-lg p-1 text-muted hover:text-foreground hover:bg-black/5"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="mt-4 space-y-4 flex-1 overflow-y-auto">
                  {navGroups.map((group) => (
                    <div key={group.title} className="space-y-1">
                      <p className="px-2 text-[10px] font-bold text-muted uppercase tracking-wider">
                        {group.title}
                      </p>
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileSidebarOpen(false)}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                            isActive(item.href)
                              ? "bg-white text-primary"
                              : "text-foreground hover:bg-black/5"
                          }`}
                        >
                          <span className={isActive(item.href) ? "text-primary" : "text-muted"}>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  ))}
                </nav>
                <div className="border-t border-border pt-3">
                  <Link
                    href={`/${siteConfig.locale}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg bg-white py-2 text-xs font-bold text-primary"
                  >
                    <Globe className="h-3.5 w-3.5 text-secondary" />
                    Open Website
                    <ExternalLink className="h-3 w-3 text-muted" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* PAGE CONTENT */}
          <main id="admin-main" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
