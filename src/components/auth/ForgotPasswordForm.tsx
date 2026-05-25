"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (!captchaToken) {
        throw new Error("Please complete the verification challenge");
      }
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, captchaToken }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      setSuccess(
        "If an account exists for that email, a recovery link has been sent."
      );
      setEmail("");
      setCaptchaToken("");
      setCaptchaResetSignal((prev) => prev + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send reset email"
      );
      setCaptchaToken("");
      setCaptchaResetSignal((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="forgot-email"
          className="text-sm font-medium text-foreground"
        >
          Email address
        </label>
        <Input
          id="forgot-email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          className="h-12"
        />
      </div>

      {error ? (
        <div className="text-sm text-danger bg-danger/10 border border-danger/20 p-3 rounded-md">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="text-sm text-success bg-success/10 border border-success/20 p-3 rounded-md">
          {success}
        </div>
      ) : null}
      <div className="space-y-2">
        <TurnstileWidget
          action="forgot-password"
          onTokenChange={setCaptchaToken}
          resetSignal={captchaResetSignal}
        />
        {!captchaToken && (
          <p className="text-xs text-muted-foreground">
            Complete the verification challenge to continue.
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending..." : "Send recovery link"}
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
        <Link
          href="/login"
          className="text-primary hover:opacity-80 transition-opacity"
        >
          Back to login
        </Link>
      </div>
    </form>
  );
}
