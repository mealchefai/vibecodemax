import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth";
import { getUser } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const user = await getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="bg-surface backdrop-blur-sm border border-border rounded-lg p-6 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              Reset your password
            </h2>
            <p className="text-muted-foreground">
              Enter your email address and we&apos;ll send you a recovery link.
            </p>
          </div>

          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
