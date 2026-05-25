"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          action?: string;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
        }
      ) => string;
      remove?: (widgetId: string) => void;
      reset?: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  action: string;
  onTokenChange: (token: string) => void;
  resetSignal?: number;
}

export function TurnstileWidget({
  action,
  onTokenChange,
  resetSignal = 0,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== "undefined" && Boolean(window.turnstile)
  );
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  useEffect(() => {
    if (
      !scriptReady ||
      !containerRef.current ||
      !window.turnstile ||
      widgetIdRef.current
    ) {
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      callback: (token) => onTokenChange(token),
      "expired-callback": () => onTokenChange(""),
      "error-callback": () => onTokenChange(""),
      theme: "auto",
      size: "flexible",
    });

    return () => {
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, onTokenChange, scriptReady, siteKey]);

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current && window.turnstile?.reset) {
      window.turnstile.reset(widgetIdRef.current);
      onTokenChange("");
    }
  }, [onTokenChange, resetSignal]);

  return (
    <>
      <Script
        id="cf-turnstile-script"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="min-h-[65px] w-full" />
    </>
  );
}
