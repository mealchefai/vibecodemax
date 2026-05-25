"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";

interface MagicLinkFormProps {
  postAuthRedirectTo?: string;
}

export function MagicLinkForm({ postAuthRedirectTo }: MagicLinkFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!captchaToken) {
        throw new Error("Please complete the verification challenge");
      }
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          next: postAuthRedirectTo || "/app",
          captchaToken,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data.error || "Failed to send magic link. Please try again."
        );
      }

      setSent(true);
      setCaptchaToken("");
      setCaptchaResetSignal((prev) => prev + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send magic link. Please try again."
      );
      setCaptchaToken("");
      setCaptchaResetSignal((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4 p-4 bg-success/10 border border-success/20 rounded-lg">
        <div className="text-success">
          <svg
            className="h-12 w-12 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="font-semibold text-foreground">Check your email</h3>
        <p className="text-sm text-text-secondary">
          We sent a magic link to <strong>{email}</strong>. Click the link in
          the email to sign in.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="magic-email">Email</Label>
        <Input
          id="magic-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/20 p-3 rounded-md">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <TurnstileWidget
          action="magic-link"
          onTokenChange={setCaptchaToken}
          resetSignal={captchaResetSignal}
        />
        {!captchaToken && (
          <p className="text-xs text-muted-foreground">
            Complete the verification challenge to continue.
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="outline"
        className="w-full"
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Sending...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Send magic link
          </span>
        )}
      </Button>
    </form>
  );
}
