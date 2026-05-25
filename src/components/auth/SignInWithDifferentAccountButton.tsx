"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOut as signOutBrowser } from "@/lib/auth/supabase/client";

export function SignInWithDifferentAccountButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleClick = async () => {
    setIsLoggingOut(true);

    try {
      await signOutBrowser();

      router.replace("/login?next=/admin");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <Button type="button" variant="default" onClick={handleClick}>
      {isLoggingOut ? "Signing out..." : "Sign in with a different account"}
    </Button>
  );
}
