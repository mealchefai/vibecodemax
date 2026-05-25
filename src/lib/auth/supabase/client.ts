import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildPublicAppUrl } from "@/lib/auth/redirect-url";

/**
 * Auth-specific utility functions for browser-side authentication.
 *
 * These helpers use the shared Supabase browser client from the integrations layer.
 */

export async function signInWithEmail(email: string, password: string) {
  const supabase = createSupabaseBrowserClient();
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = createSupabaseBrowserClient();
  return await supabase.auth.signUp({
    email,
    password,
  });
}

export async function signOut() {
  const supabase = createSupabaseBrowserClient();
  return await supabase.auth.signOut();
}

export async function resetPassword(email: string) {
  const supabase = createSupabaseBrowserClient();
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildPublicAppUrl("/reset-password"),
  });
}

export async function updatePassword(password: string) {
  const supabase = createSupabaseBrowserClient();
  return await supabase.auth.updateUser({
    password,
  });
}

export async function getCurrentUser() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentSession() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}
