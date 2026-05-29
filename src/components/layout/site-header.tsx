/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui";
import { signOut as signOutBrowser } from "@/lib/auth/supabase/client";

type NavItem = {
  label: string;
  href: string;
};

const publicNavItems: NavItem[] = [
  {
    label: "Pricing",
    href: "/pricing",
  },
  {
    label: "Contact",
    href: "/contact",
  },
];

const accountDropdownItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/app",
  },
  {
    label: "Profile",
    href: "/app/profile",
  },
  {
    label: "Health Profile",
    href: "/app/settings/health-profile",
  },
  {
    label: "Admin",
    href: "/admin",
  },
];

interface SiteHeaderProps {
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
    role?: string;
  } | null;
}

export function SiteHeader({ user }: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [logoVisible, setLogoVisible] = React.useState(true);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const isAdminRoute = pathname.startsWith("/admin");
  const isProtectedAppRoute = pathname.startsWith("/app");
  const showMarketingLinks = !isAdminRoute && !isProtectedAppRoute;
  const isAdmin = ["admin", "super", "moderator"].includes(user?.role ?? "");
  const mobileMenuBreakpointClass = isAdminRoute ? "lg:hidden" : "md:hidden";
  const desktopActionsClass = isAdminRoute ? "hidden lg:flex" : "hidden md:flex";

  const visibleAccountDropdownItems = accountDropdownItems.filter((item) => {
    if (item.href === "/admin") {
      return isAdmin;
    }
    return true;
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOutBrowser();

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 ">
      <div className="container mx-auto flex h-16 items-center gap-6 px-container-mobile md:px-container max-w-page">
        <div className="flex items-center space-x-2 flex-1 min-w-[180px]">
          <Link
            href={user ? "/" : "/"}
            className="flex items-center space-x-2 group"
          >
            {logoVisible && (
              <img
                src="/logo.png"
                alt="Meal Chef AI"
                className="h-12 w-12 object-contain"
                onError={() => setLogoVisible(false)}
              />
            )}
            <span className="font-heading text-xl font-bold text-foreground">
              Meal Chef AI
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex flex-1 items-center justify-center space-x-1">
          {showMarketingLinks
            ? publicNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.href)
                      ? "text-foreground"
                      : "text-text-secondary hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))
            : null}
        </nav>

        <div className="flex items-center space-x-3 justify-end flex-1 min-w-[180px]">
          {user ? (
            <div className="flex items-center space-x-2">
              <Dropdown>
                <DropdownTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative hover:bg-transparent hover:text-inherit"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center ">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name || user.email}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-primary-foreground">
                          {(user.name || user.email)?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </Button>
                </DropdownTrigger>
                <DropdownContent
                  align="end"
                  className="bg-surface border-border"
                >
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user.name && <p className="font-medium">{user.name}</p>}
                      <p className="text-xs text-text-secondary">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownSeparator />
                  {visibleAccountDropdownItems.map((item) => (
                    <DropdownItem
                      key={item.href}
                      asChild
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive(item.href)
                          ? "text-foreground"
                          : "text-text-secondary hover:text-foreground"
                      }`}
                    >
                      <Link href={item.href}>{item.label}</Link>
                    </DropdownItem>
                  ))}
                  <DropdownSeparator />
                  <DropdownItem
                    onClick={handleLogout}
                    className="px-3 py-2 text-sm font-medium rounded-md transition-colors text-text-secondary hover:text-foreground cursor-pointer"
                  >
                    {isLoggingOut ? "Signing Out..." : "Sign Out"}
                  </DropdownItem>
                </DropdownContent>
              </Dropdown>
            </div>
          ) : (
            <>
              <div className={`${desktopActionsClass} items-center space-x-2`}>
                <Button variant="secondary" size="sm" className="px-4" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button size="sm" className="px-4 py-2" asChild>
                  <Link href="/register">Sign Up</Link>
                </Button>
              </div>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            className={mobileMenuBreakpointClass}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d={
                  mobileMenuOpen
                    ? "m6 6 12 12M6 18 18 6"
                    : "M3 12h18M3 6h18M3 18h18"
                }
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className={mobileMenuBreakpointClass}>
          <div className="space-y-1 px-2 pb-3 pt-2 border-t">
            {user ? (
              <>
                {showMarketingLinks && publicNavItems.length > 0 ? (
                  <>
                    {publicNavItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block px-3 py-2 text-base font-medium transition-colors ${
                          isActive(item.href)
                            ? "text-foreground"
                            : "text-text-secondary hover:text-foreground"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <div className="border-t my-2" />
                  </>
                ) : null}
                {visibleAccountDropdownItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-3 py-2 text-base font-medium transition-colors ${
                      isActive(item.href)
                        ? "text-foreground"
                        : "text-text-secondary hover:text-foreground"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="border-t my-2" />
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-base font-medium transition-colors text-text-secondary hover:text-foreground"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await handleLogout();
                  }}
                >
                  {isLoggingOut ? "Signing Out..." : "Sign Out"}
                </button>
              </>
            ) : (
              <>
                {publicNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-3 py-2 text-base font-medium transition-colors ${
                      isActive(item.href)
                        ? "text-foreground"
                        : "text-text-secondary hover:text-foreground"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <>
                  <div className="border-t my-2" />
                  <Link
                    href="/login"
                    className="block px-3 py-2 text-base font-medium transition-colors text-text-secondary hover:text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="block px-3 py-2 text-base font-medium transition-colors text-text-secondary hover:text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
