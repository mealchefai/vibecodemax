import { requireUser } from "@/lib/auth/require-user";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function AppPage() {
  const user = await requireUser();
  const displayName = user.name || user.email || "there";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary">
            Welcome back
          </h1>
          <p className="text-text-secondary mt-3 text-lg">
            Signed in as{" "}
            <span className="font-semibold text-foreground">{displayName}</span>
            .
          </p>
        </div>

        <div className="mt-8">
          <Card className="bg-surface border-border ">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center ">
                  <svg
                    className="h-5 w-5 text-primary-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold">Getting Started</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Here are the next steps for this project:
                </p>

                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        className="h-3 w-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-foreground">
                      Complete your profile setup
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        className="h-3 w-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-foreground">
                      Explore your dashboard and profile settings
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        className="h-3 w-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-foreground">
                      Connect the next feature you want to build
                    </span>
                  </li>
                </ul>

                <div className="flex gap-3 pt-2">
                  <Button size="sm" asChild>
                    <Link href="/app/profile">Complete Profile</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
