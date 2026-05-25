import { redirect } from "next/navigation";
import Link from "next/link";
import { AdaptiveAuthForm } from "@/components/auth/AdaptiveAuthForm";
import { getUser } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";

type AuthSearchParams = Promise<{
  next?: string | string[];
}>;

function normalizeRedirectPath(path: string): string {
  return path.split("?")[0]?.split("#")[0] || path;
}

function isSafeRedirect(path: string): boolean {
  const normalized = normalizeRedirectPath(path);
  const isAllowedApiRedirect = normalized === "/api/payments/checkout";

  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    normalized !== "/login" &&
    normalized !== "/register" &&
    normalized !== "/forgot-password" &&
    normalized !== "/reset-password" &&
    (!normalized.startsWith("/api/") || isAllowedApiRedirect)
  );
}

async function getPostAuthRedirectTo(searchParams?: AuthSearchParams) {
  const params = searchParams ? await searchParams : {};
  const next = Array.isArray(params.next) ? params.next[0] : params.next;

  return next && isSafeRedirect(next) ? next : "/app";
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: AuthSearchParams;
}) {
  const user = await getUser();
  const postAuthRedirectTo = await getPostAuthRedirectTo(searchParams);

  if (user) {
    redirect(postAuthRedirectTo);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Form Container */}
        <div className="bg-surface backdrop-blur-sm border border-border rounded-lg p-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              Create your account
            </h2>
            <p className="text-muted-foreground">
              Get started with your new account
            </p>
          </div>

          {/* Adaptive Auth Form */}
          <AdaptiveAuthForm
            mode="register"
            postAuthRedirectTo={postAuthRedirectTo}
          />

          {/* Sign In Link */}
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary hover:opacity-80 transition-opacity"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
