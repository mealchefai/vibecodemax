"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthErrorLike = {
  message?: string;
  code?: string;
};

function toAuthErrorLike(value: unknown): AuthErrorLike {
  if (!value || typeof value !== "object") {
    return {};
  }
  const maybe = value as Record<string, unknown>;
  return {
    message: typeof maybe.message === "string" ? maybe.message : undefined,
    code: typeof maybe.code === "string" ? maybe.code : undefined,
  };
}

function isMissingSessionError(error: unknown): boolean {
  const { message, code } = toAuthErrorLike(error);
  const normalizedMessage = (message || "").toLowerCase();
  const normalizedCode = (code || "").toLowerCase();

  return (
    normalizedCode === "session_not_found" ||
    normalizedCode === "refresh_token_not_found" ||
    normalizedCode === "invalid_refresh_token" ||
    normalizedMessage.includes("auth session missing") ||
    normalizedMessage.includes("session not found") ||
    normalizedMessage.includes("refresh token not found")
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkRecoverySession() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (cancelled) {
          return;
        }

        if (sessionError || !data.session) {
          setError(
            "Invalid or expired reset link. Request a new recovery email."
          );
          setReady(false);
        } else {
          setError(null);
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Unable to verify your reset link. Request a new recovery email."
          );
          setReady(false);
        }
      } finally {
        if (!cancelled) {
          setSessionChecked(true);
        }
      }
    }

    void checkRecoverySession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      if (!ready) {
        throw new Error(
          "Invalid or expired reset link. Request a new recovery email."
        );
      }

      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        throw new Error(updateError.message || "Failed to update password");
      }

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError && !isMissingSessionError(signOutError)) {
        throw new Error(
          signOutError.message || "Password updated but sign out failed"
        );
      }

      setSuccess("Your password has been updated. Redirecting to login...");
      setPassword("");
      setConfirmPassword("");
      window.setTimeout(() => {
        router.replace("/login?message=password_updated");
        router.refresh();
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update password"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Checking your recovery link...
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="space-y-4">
        {error ? (
          <div className="text-sm text-danger bg-danger/10 border border-danger/20 p-3 rounded-md">
            {error}
          </div>
        ) : null}

        <div className="text-center text-sm text-muted-foreground">
          Need a new link?{" "}
          <Link
            href="/forgot-password"
            className="text-primary hover:opacity-80 transition-opacity"
          >
            Request another recovery email
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="reset-password"
          className="text-sm font-medium text-foreground"
        >
          New password
        </label>
        <Input
          id="reset-password"
          type="password"
          placeholder="Create a new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          disabled={loading}
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="reset-password-confirm"
          className="text-sm font-medium text-foreground"
        >
          Confirm password
        </label>
        <Input
          id="reset-password-confirm"
          type="password"
          placeholder="Confirm your new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
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

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Updating..." : "Update password"}
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        Need a new link?{" "}
        <Link
          href="/forgot-password"
          className="text-primary hover:opacity-80 transition-opacity"
        >
          Request another recovery email
        </Link>
      </div>
    </form>
  );
}
