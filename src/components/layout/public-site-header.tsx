"use client";

import React from "react";
import type { User } from "@supabase/supabase-js";
import { SiteHeader } from "@/components/layout";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type HeaderUser = {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role?: string;
} | null;

type AdminLookupRow = {
  role: string | null;
};

function normalizeAdminRole(value: unknown): string | undefined {
  return value === "super" || value === "moderator" ? value : undefined;
}

async function toHeaderUser(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  user: User | null
): Promise<HeaderUser> {
  if (!user || !user.email) {
    return null;
  }

  const { data } = await (supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle() as unknown as Promise<{
    data: AdminLookupRow | null;
    error: unknown;
  }>);

  return {
    id: user.id,
    email: user.email,
    role: normalizeAdminRole(data?.role),
  };
}

export function PublicSiteHeader() {
  const [user, setUser] = React.useState<HeaderUser>(null);

  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let isActive = true;

    const syncUser = async (currentUser: User | null) => {
      const nextUser = await toHeaderUser(supabase, currentUser);
      if (isActive) {
        setUser(nextUser);
      }
    };

    void supabase.auth.getUser().then(({ data: { user } }) => {
      void syncUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUser(session?.user ?? null);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  return <SiteHeader user={user} />;
}
