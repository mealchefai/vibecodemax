"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";

type ConfirmEmailFormProps = {
  initialEmail?: string;
  reason?: string;
};

export function ConfirmEmailForm({
  initialEmail = "",
  reason = "",
}: ConfirmEmailFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);

  const hasLinkError = reason.trim().length > 0;
  const isExpired = reason.toLowerCase().includes("expired");
  const isInvalid = reason.toLowerCase().includes("invalid");

  const handleResend = async () => {
    setError(null);
    setStatus(null);

    if (!email.trim()) {
      setError("Enter your email to resend the confirmation link.");
      return;
    }

    setLoading(true);
    try {
      if (!captchaToken) {
        throw new Error("Please complete the verification challenge");
      }
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, captchaToken }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to resend confirmation email.");
      }

      setStatus(data.message || "Confirmation email sent. Check your inbox.");
      setCaptchaToken("");
      setCaptchaResetSignal((prev) => prev + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to resend confirmation email."
      );
      setCaptchaToken("");
      setCaptchaResetSignal((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-foreground">
          {isExpired
            ? "Link expired"
            : isInvalid
              ? "Invalid link"
              : hasLinkError
                ? "Confirmation failed"
                : "Confirm your email"}
        </h2>
        <p className="text-muted-foreground">
          {isExpired
            ? "Your confirmation link has expired. Enter your email below to get a new one."
            : isInvalid
              ? "This confirmation link is invalid or has already been used. Request a new one below."
              : hasLinkError
                ? reason
                : "We sent a confirmation link to your email. Confirm your address to finish creating your account."}
        </p>
      </div>

      {error ? (
        <div className="text-sm text-danger bg-danger/10 border border-danger/20 p-3 rounded-md">
          {error}
        </div>
      ) : null}

      {status ? (
        <div className="text-sm text-success bg-success/10 border border-success/20 p-3 rounded-md">
          {status}
        </div>
      ) : null}

      <div className="space-y-3">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 bg-background border-border"
          disabled={loading}
        />
        <div className="space-y-2">
          <TurnstileWidget
            action="confirm-email"
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
          type="button"
          className="w-full"
          onClick={handleResend}
          disabled={loading}
        >
          {loading ? "Sending..." : "Resend confirmation email"}
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Already confirmed?{" "}
        <Link
          href="/login"
          className="text-primary hover:opacity-80 transition-opacity"
        >
          Sign in
        </Link>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Need a different email?{" "}
        <Link
          href="/register"
          className="text-primary hover:opacity-80 transition-opacity"
        >
          Go back to signup
        </Link>
      </div>
    </div>
  );
}
