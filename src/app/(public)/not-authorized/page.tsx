import { SignInWithDifferentAccountButton } from "@/components/auth";

export default function NotAuthorizedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-surface border border-border rounded-lg p-8 text-center space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
            <svg
              className="w-8 h-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to access this area. Admin privileges
            are required.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <SignInWithDifferentAccountButton />
        </div>
      </div>
    </div>
  );
}
