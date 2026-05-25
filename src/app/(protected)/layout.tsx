import { requireUser } from "@/lib/auth/require-user";
import { getAdminStatus } from "@/lib/auth/require-admin";
import { SiteHeader } from "@/components/layout/site-header";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Check if user is admin (non-blocking)
  const isAdmin = await getAdminStatus(user.id);

  // Transform user data for header component
  const userForHeader = {
    id: user.id,
    email: user.email || "",
    name: user.name || undefined,
    avatar: user.avatar_url || undefined,
    role: isAdmin ? "admin" : "user",
  };

  return (
    <>
      <SiteHeader user={userForHeader} />
      <main className="flex-1">{children}</main>
    </>
  );
}
