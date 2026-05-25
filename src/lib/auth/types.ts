/**
 * Shared Auth Types
 *
 * These types are used across all auth provider implementations.
 */

/**
 * User object returned by auth providers
 *
 * This is the normalized user shape that all auth providers
 * must convert their native user object into.
 */
export interface User {
  /** Unique user identifier (always a string) */
  id: string;

  /** User's email address (can be null for some auth methods) */
  email: string | null;

  /** User's display name (can be null) */
  name: string | null;

  /** URL to user's avatar image (optional) */
  avatar_url?: string | null;

  /** Timestamp when user was created (ISO 8601 string) */
  created_at?: string;

  /** Timestamp when user was last updated (ISO 8601 string) */
  updated_at?: string;
}

/**
 * Admin user object with elevated permissions
 *
 * Extends User with admin-specific fields.
 */
export interface AdminUser extends User {
  /** Always true for admin users */
  isAdmin: true;

  /** Admin role level (optional, for role-based permissions) */
  adminRole?: "super" | "moderator";

  /** List of permissions this admin has (optional) */
  permissions?: string[];
}
