"use client";

import { EmailPasswordForm } from "./EmailPasswordForm";
import { GoogleOAuthButton } from "./GoogleOAuthButton";
import { MagicLinkForm } from "./MagicLinkForm";
import { useState } from "react";

interface AdaptiveAuthFormProps {
  mode: "login" | "register";
  postAuthRedirectTo?: string;
}

function Divider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">
          Or continue with
        </span>
      </div>
    </div>
  );
}

export function AdaptiveAuthForm({
  mode,
  postAuthRedirectTo,
}: AdaptiveAuthFormProps) {
  const [useMagicLink, setUseMagicLink] = useState(false);

  return (
    <div className="space-y-4">
      {!useMagicLink && (
        <EmailPasswordForm
          mode={mode}
          postAuthRedirectTo={postAuthRedirectTo}
        />
      )}

      {useMagicLink && (
        <MagicLinkForm postAuthRedirectTo={postAuthRedirectTo} />
      )}

      <button
        type="button"
        onClick={() => setUseMagicLink(!useMagicLink)}
        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {useMagicLink ? "Use password instead" : "Send me a magic link instead"}
      </button>

      <Divider />

      <GoogleOAuthButton postAuthRedirectTo={postAuthRedirectTo} />
    </div>
  );
}
