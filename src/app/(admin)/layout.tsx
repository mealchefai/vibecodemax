import { requireAdmin } from "@/lib/auth/require-admin";
import { SiteHeader } from "@/components/layout/site-header";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminUser = await requireAdmin();

  const userForHeader = {
    id: adminUser.id,
    email: adminUser.email || "",
    name: adminUser.name || undefined,
    avatar: adminUser.avatar_url || undefined,
    role: "admin",
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <SiteHeader user={userForHeader} />
      <main className="h-[calc(100vh-4rem)] overflow-hidden">{children}</main>
    </div>
  );
}
