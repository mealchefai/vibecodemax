import { AdminShell } from "@/components/layout/admin-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listUsers } from "./actions";
import { UserActions } from "./_components/user-actions";
import { InviteUserButton } from "./_components/invite-user-button";
/* eslint-disable @next/next/no-img-element */

type UserPageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

export default async function UserPage({ searchParams }: UserPageProps) {
  const resolvedSearchParams = await searchParams;
  const parsedPage = Number(resolvedSearchParams?.page ?? "1");
  const page =
    Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;
  const pageSize = 20;
  const { users, hasNextPage } = await listUsers({ page, pageSize });
  const buildPageHref = (targetPage: number) =>
    `/admin/users?page=${targetPage}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-danger/10 text-danger">Admin</Badge>;
      case "user":
        return <Badge variant="outline">User</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const renderUserAvatar = (name: string, avatarUrl: string | null) => {
    const initial = (name.trim().charAt(0) || "?").toUpperCase();

    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={`${name} avatar`}
          className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-primary/20"
        />
      );
    }

    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
        <span className="text-sm font-semibold text-primary">{initial}</span>
      </div>
    );
  };

  return (
    <AdminShell>
      <div className="p-6 space-y-8">
        <div className="flex justify-between items-center">
          <PageHeader
            title="User Management"
            description="Manage users and roles"
          />
          <InviteUserButton />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile/Tablet list */}
            <div className="space-y-3 md:hidden">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-start gap-3">
                    {renderUserAvatar(u.name, u.avatarUrl)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-foreground break-words">
                            {u.name}
                          </div>
                          <div className="text-sm text-text-secondary break-all">
                            {u.email}
                          </div>
                        </div>
                        {getRoleBadge(u.role)}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-text-secondary">
                          Joined {formatDate(u.joinedAt)}
                        </span>
                        <UserActions user={u} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="overflow-x-auto">
              <table className="hidden w-full md:table">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      User
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Role
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Joined
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {renderUserAvatar(u.name, u.avatarUrl)}
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground">
                              {u.name}
                            </div>
                            <div className="text-sm text-text-secondary">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {formatDate(u.joinedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end">
                          <UserActions user={u} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-text-secondary">Page {page}</div>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button asChild variant="outline" size="sm">
                    <a href={buildPageHref(page - 1)}>Previous</a>
                  </Button>
                )}
                {hasNextPage && (
                  <Button asChild variant="outline" size="sm">
                    <a href={buildPageHref(page + 1)}>Next</a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
