"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Badge } from "@/components/ui";

interface AdminShellProps {
  children: React.ReactNode;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  disabled?: boolean;
  description?: string;
}

const productsNavigationItem: NavigationItem = {
  label: "Products",
  href: "/admin/products",
  description: "Manage your payments product catalog",
  icon: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7 12 3 4 7m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  ),
};

const usersNavigationItem: NavigationItem = {
  label: "Users",
  href: "/admin/users",
  description: "Manage user accounts and basic admin status",
  icon: (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navigationItemsByHref: Record<string, NavigationItem> = {
    "/admin/products": productsNavigationItem,
    "/admin/users": usersNavigationItem,
  };

  const filteredNavigation: NavigationItem[] = [
    navigationItemsByHref["/admin/products"],
    navigationItemsByHref["/admin/users"],
  ].filter((item): item is NavigationItem => Boolean(item));

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="h-full min-h-0 overflow-hidden bg-surface">
      <div className="flex h-full min-h-0 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex h-full min-h-0 shrink-0 flex-col ${
            sidebarCollapsed ? "w-16" : "w-72"
          } border-r border-border bg-background transition-all duration-300`}
        >
          <div className="flex-1 overflow-auto">
            <nav className="p-6 space-y-1">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.disabled ? "#" : item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 ${
                    isActive(item.href)
                      ? "bg-foreground/10 text-text-primary "
                      : "text-text-primary/90 hover:text-text-primary hover:bg-foreground/10 "
                  } ${item.disabled ? "opacity-50 cursor-not-allowed" : ""} ${
                    sidebarCollapsed ? "justify-center px-2" : ""
                  }`}
                  title={item.label}
                >
                  {item.icon}
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="font-bold">{item.label}</div>
                    </div>
                  )}
                  {!sidebarCollapsed && item.badge && (
                    <Badge
                      variant="secondary"
                      className="ml-auto bg-surface/60 text-text-primary"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed left-0 top-0 h-full w-[85vw] max-w-80 border-r border-border bg-background ">
              <div className="flex h-16 items-center gap-4 border-b border-border px-6">
                <span className="font-heading text-lg font-semibold text-text-primary">
                  Admin Dashboard
                </span>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </Button>
              </div>

              <div className="flex-1 overflow-auto">
                <nav className="p-6 space-y-1">
                  {filteredNavigation.map((item) => (
                    <Link
                      key={item.href}
                      href={item.disabled ? "#" : item.href}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 ${
                        isActive(item.href)
                          ? "bg-foreground/10 text-text-primary "
                          : "text-text-primary/90 hover:text-text-primary hover:bg-foreground/10 "
                      } ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.icon}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold">{item.label}</div>
                      </div>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="ml-auto bg-surface/60 text-text-primary"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 h-full min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
