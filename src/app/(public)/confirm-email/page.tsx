import { redirect } from "next/navigation";
import { ConfirmEmailForm } from "@/components/auth";
import { getUser } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";

type ConfirmEmailPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string {
  const value = params[key];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function ConfirmEmailPage({
  searchParams,
}: ConfirmEmailPageProps) {
  const user = await getUser();
  const resolvedSearchParams = (await searchParams) || {};

  if (user) {
    redirect("/app");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="bg-surface backdrop-blur-sm border border-border rounded-lg p-6 space-y-6">
          <ConfirmEmailForm
            initialEmail={readSearchParam(resolvedSearchParams, "email")}
            reason={readSearchParam(resolvedSearchParams, "reason")}
          />
        </div>
      </div>
    </div>
  );
}
