import { ResetPasswordForm } from "@/components/auth";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="bg-surface backdrop-blur-sm border border-border rounded-lg p-6 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              Choose a new password
            </h2>
            <p className="text-muted-foreground">
              Enter a new password for your account.
            </p>
          </div>

          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
