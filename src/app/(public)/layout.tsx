import React from "react";
import { PublicSiteHeader } from "@/components/layout/public-site-header";
import { SiteFooter } from "@/components/layout";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default async function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <PublicSiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
