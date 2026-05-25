"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  joinedAt: string;
  avatarUrl: string | null;
};

type ListUsersResult = {
  users: UserRow[];
  hasNextPage: boolean;
  page: number;
  pageSize: number;
};

type ListUsersOptions = {
  page?: number;
  pageSize?: number;
};

type UpdateUserInput = {
  userId: string;
  name?: string;
  email?: string;
  isAdmin?: boolean;
};

type UpdateUserResult = {
  success: boolean;
  error?: string;
};

type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
};

type CreateUserResult = {
  success: boolean;
  error?: string;
};

type DeleteUserResult = {
  success: boolean;
  error?: string;
};

type QueryError = { message: string };
type QueryResponse<T> = { data: T | null; error: QueryError | null };
type AuthAdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  user_metadata?: Record<string, unknown> | null;
};
type ProfileRow = {
  id: string;
  display_name: string | null;
};

type AdminSupabaseClient = {
  auth: {
    admin: {
      listUsers: (args: {
        page: number;
        perPage: number;
      }) => Promise<QueryResponse<{ users: AuthAdminUser[] }>>;
      createUser: (args: {
        email: string;
        password: string;
        email_confirm: boolean;
        user_metadata: { name: string };
      }) => Promise<QueryResponse<{ user: { id: string } | null }>>;
      updateUserById: (
        userId: string,
        args: { email: string }
      ) => Promise<{ error: QueryError | null }>;
      deleteUser: (userId: string) => Promise<{ error: QueryError | null }>;
    };
  };
  from: (table: string) => unknown;
};

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  isAdmin: z.boolean(),
});

const updateUserSchema = z
  .object({
    userId: z.string().trim().min(1, "User id is required."),
    name: z.string().trim().min(1, "Name is required.").optional(),
    email: z.string().trim().email("Enter a valid email address.").optional(),
    isAdmin: z.boolean().optional(),
  })
  .refine(
    (input) =>
      input.name !== undefined ||
      input.email !== undefined ||
      input.isAdmin !== undefined,
    "No updates were provided."
  );

function getAdminClient(): AdminSupabaseClient {
  return supabaseAdmin() as unknown as AdminSupabaseClient;
}

function getValidationError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input.";
}

function deriveName(
  email: string | null | undefined,
  fallback?: string | null | undefined
): string {
  if (fallback && fallback.trim()) {
    return fallback.trim();
  }
  if (!email) {
    return "User";
  }
  const prefix = email.split("@")[0];
  return prefix || "User";
}

function readMetadataName(user: AuthAdminUser): string | undefined {
  const name = user.user_metadata?.name;
  return typeof name === "string" ? name : undefined;
}

function readMetadataAvatarUrl(user: AuthAdminUser): string | null {
  const avatarUrl = user.user_metadata?.avatar_url;
  return typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl : null;
}

export async function listUsers(
  options: ListUsersOptions = {}
): Promise<ListUsersResult> {
  await requireAdmin();

  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(99, Math.max(1, options.pageSize || 20));

  const supabase = getAdminClient();
  const { data: usersData, error: usersError } =
    await supabase.auth.admin.listUsers({
      page,
      perPage: pageSize + 1,
    });

  if (usersError || !usersData) {
    throw new Error(usersError?.message || "Failed to load users.");
  }

  const hasNextPage = usersData.users.length > pageSize;
  const users = usersData.users.slice(0, pageSize);

  const userIds = users.map((user) => user.id);
  const adminUsersTable = supabase.from("admin_users") as {
    select: (
      columns: string
    ) => Promise<QueryResponse<Array<{ user_id: string }>>>;
  };
  const { data: adminRows, error: adminError } =
    await adminUsersTable.select("user_id");

  if (adminError) {
    throw new Error(adminError.message);
  }

  const adminIds = new Set((adminRows || []).map((row) => row.user_id));

  const profilesById = new Map<
    string,
    {
      displayName: string | null;
      avatarUrl: string | null;
    }
  >();
  if (userIds.length > 0) {
    const profilesTable = supabase.from("profiles") as {
      select: (columns: string) => {
        in: (
          column: string,
          values: string[]
        ) => Promise<QueryResponse<ProfileRow[]>>;
      };
    };
    const { data: profiles, error: profilesError } = await profilesTable
      .select("id, display_name")
      .in("id", userIds);

    if (!profilesError && profiles) {
      for (const profile of profiles) {
        profilesById.set(profile.id, {
          displayName: profile.display_name ?? null,
          avatarUrl: null,
        });
      }
    }
  }

  const rows: UserRow[] = users.map((user) => ({
    id: user.id,
    name: deriveName(
      user.email,
      profilesById.get(user.id)?.displayName ?? readMetadataName(user)
    ),
    email: user.email ?? "",
    role: adminIds.has(user.id) ? "admin" : "user",
    joinedAt: user.created_at,
    avatarUrl: readMetadataAvatarUrl(user),
  }));

  return {
    users: rows,
    hasNextPage,
    page,
    pageSize,
  };
}

export async function createUser(
  input: CreateUserInput
): Promise<CreateUserResult> {
  try {
    await requireAdmin();

    const parsed = createUserSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: getValidationError(parsed.error) };
    }

    const { name, email, password, isAdmin } = parsed.data;
    const supabase = getAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (error || !data?.user) {
      return {
        success: false,
        error: error?.message || "Failed to create user.",
      };
    }

    if (isAdmin) {
      const adminUsersTable = supabase.from("admin_users") as {
        insert: (row: {
          user_id: string;
          role: "super";
        }) => Promise<{ error: QueryError | null }>;
      };
      const { error: adminError } = await adminUsersTable.insert({
        user_id: data.user.id,
        role: "super",
      });

      if (adminError) {
        return {
          success: false,
          error: `Failed to grant admin access: ${adminError.message}`,
        };
      }
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}

export async function deleteUser(userId: string): Promise<DeleteUserResult> {
  try {
    const actor = await requireAdmin();

    const normalizedUserId = userId.trim();
    if (!normalizedUserId) {
      return { success: false, error: "User id is required." };
    }

    if (normalizedUserId === actor.id) {
      return {
        success: false,
        error: "You cannot delete your own admin account.",
      };
    }

    const supabase = getAdminClient();
    const { error: authError } =
      await supabase.auth.admin.deleteUser(normalizedUserId);
    if (authError) {
      return {
        success: false,
        error: `Failed to delete auth user: ${authError.message}`,
      };
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}

export async function updateUser(
  input: UpdateUserInput
): Promise<UpdateUserResult> {
  try {
    const actor = await requireAdmin();

    const parsed = updateUserSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: getValidationError(parsed.error) };
    }

    const supabase = getAdminClient();
    const { userId, email, name, isAdmin } = parsed.data;

    if (userId === actor.id && isAdmin === false) {
      return {
        success: false,
        error: "You cannot revoke admin access from your own account.",
      };
    }

    if (email !== undefined) {
      const { error: emailError } = await supabase.auth.admin.updateUserById(
        userId,
        { email }
      );
      if (emailError) {
        return {
          success: false,
          error: `Failed to update email: ${emailError.message}`,
        };
      }
    }

    if (name !== undefined) {
      const profilesTable = supabase.from("profiles") as {
        update: (row: { display_name: string }) => {
          eq: (
            column: string,
            value: string
          ) => Promise<{ error: QueryError | null }>;
        };
      };
      const { error: profileError } = await profilesTable
        .update({ display_name: name })
        .eq("id", userId);

      if (profileError) {
        return {
          success: false,
          error: `Failed to update name: ${profileError.message}`,
        };
      }
    }

    if (isAdmin !== undefined) {
      const adminLookupTable = supabase.from("admin_users") as {
        select: (columns: string) => {
          eq: (
            column: string,
            value: string
          ) => {
            maybeSingle: () => Promise<QueryResponse<{ user_id: string }>>;
          };
        };
      };

      const { data: existingAdmin } = await adminLookupTable
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (isAdmin && !existingAdmin) {
        const adminInsertTable = supabase.from("admin_users") as {
          insert: (row: {
            user_id: string;
            role: "super";
          }) => Promise<{ error: QueryError | null }>;
        };
        const { error: adminError } = await adminInsertTable.insert({
          user_id: userId,
          role: "super",
        });

        if (adminError) {
          return {
            success: false,
            error: `Failed to grant admin access: ${adminError.message}`,
          };
        }
      } else if (!isAdmin && existingAdmin) {
        const adminDeleteTable = supabase.from("admin_users") as {
          delete: () => {
            eq: (
              column: string,
              value: string
            ) => Promise<{ error: QueryError | null }>;
          };
        };
        const { error: adminError } = await adminDeleteTable
          .delete()
          .eq("user_id", userId);

        if (adminError) {
          return {
            success: false,
            error: `Failed to revoke admin access: ${adminError.message}`,
          };
        }
      }
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}
