// Supabase types for the features enabled in this project
// Keep this file in sync with any schema changes

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_file_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_file_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_file_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_users: {
        Row: {
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      files: {
        Row: {
          id: string;
          owner_user_id: string | null;
          bucket: string;
          key: string;
          mime_type: string;
          size_bytes: number;
          visibility: "public" | "private";
          status: "uploading" | "ready" | "failed" | "deleted";
          metadata: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id?: string | null;
          bucket: string;
          key: string;
          mime_type: string;
          size_bytes: number;
          visibility: "public" | "private";
          status: "uploading" | "ready" | "failed" | "deleted";
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string | null;
          bucket?: string;
          key?: string;
          mime_type?: string;
          size_bytes?: number;
          visibility?: "public" | "private";
          status?: "uploading" | "ready" | "failed" | "deleted";
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          provider_product_id: string | null;
          name: string;
          description: string | null;
          provider_description: string | null;
          use_provider_description: boolean;
          badge: string | null;
          sort_order: number;
          type: "subscription" | "one_time";
          features: Record<string, unknown>[];
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          provider_product_id?: string | null;
          name: string;
          description?: string | null;
          provider_description?: string | null;
          use_provider_description?: boolean;
          badge?: string | null;
          sort_order?: number;
          type: "subscription" | "one_time";
          features?: Record<string, unknown>[];
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_product_id?: string | null;
          name?: string;
          description?: string | null;
          provider_description?: string | null;
          use_provider_description?: boolean;
          badge?: string | null;
          sort_order?: number;
          type?: "subscription" | "one_time";
          features?: Record<string, unknown>[];
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_prices: {
        Row: {
          id: string;
          product_id: string;
          provider: string;
          provider_price_id: string;
          amount_cents: number;
          currency: string;
          interval: "month" | "year" | null;
          trial_days: number | null;
          is_default: boolean;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          provider: string;
          provider_price_id: string;
          amount_cents: number;
          currency: string;
          interval?: "month" | "year" | null;
          trial_days?: number | null;
          is_default?: boolean;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          provider?: string;
          provider_price_id?: string;
          amount_cents?: number;
          currency?: string;
          interval?: "month" | "year" | null;
          trial_days?: number | null;
          is_default?: boolean;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      entitlements: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          status: "active" | "trialing" | "expired" | "revoked";
          source: "subscription" | "one_time" | "manual";
          granted_at: string;
          expires_at: string | null;
          trial_ends_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          status: "active" | "trialing" | "expired" | "revoked";
          source: "subscription" | "one_time" | "manual";
          granted_at?: string;
          expires_at?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          status?: "active" | "trialing" | "expired" | "revoked";
          source?: "subscription" | "one_time" | "manual";
          granted_at?: string;
          expires_at?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          product_price_id: string;
          provider: string;
          provider_customer_id: string;
          provider_subscription_id: string;
          status: "trialing" | "active" | "past_due" | "canceled" | "unpaid";
          provider_status: string | null;
          current_period_end: string | null;
          trial_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          product_price_id: string;
          provider: string;
          provider_customer_id: string;
          provider_subscription_id: string;
          status: "trialing" | "active" | "past_due" | "canceled" | "unpaid";
          provider_status?: string | null;
          current_period_end?: string | null;
          trial_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          product_price_id?: string;
          provider?: string;
          provider_customer_id?: string;
          provider_subscription_id?: string;
          status?: "trialing" | "active" | "past_due" | "canceled" | "unpaid";
          provider_status?: string | null;
          current_period_end?: string | null;
          trial_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          product_price_id: string;
          provider: string;
          provider_payment_id: string;
          provider_event_id: string | null;
          amount_cents: number;
          currency: string;
          purchase_type:
            | "one_time"
            | "subscription_initial"
            | "subscription_renewal";
          status: "paid" | "refunded" | "failed";
          provider_status: string | null;
          raw_payload: Record<string, unknown> | null;
          purchased_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          product_price_id: string;
          provider: string;
          provider_payment_id: string;
          provider_event_id?: string | null;
          amount_cents: number;
          currency: string;
          purchase_type?:
            | "one_time"
            | "subscription_initial"
            | "subscription_renewal";
          status: "paid" | "refunded" | "failed";
          provider_status?: string | null;
          raw_payload?: Record<string, unknown> | null;
          purchased_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          product_price_id?: string;
          provider?: string;
          provider_payment_id?: string;
          provider_event_id?: string | null;
          amount_cents?: number;
          currency?: string;
          purchase_type?:
            | "one_time"
            | "subscription_initial"
            | "subscription_renewal";
          status?: "paid" | "refunded" | "failed";
          provider_status?: string | null;
          raw_payload?: Record<string, unknown> | null;
          purchased_at?: string;
        };
        Relationships: [];
      };
      trial_history: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          started_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          started_at?: string;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          started_at?: string;
          ended_at?: string | null;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          id: string;
          provider: string;
          event_id: string;
          status: "received" | "dispatch_failed" | "dispatched";
          raw_payload: Record<string, unknown> | null;
          dispatch_error: string | null;
          dispatch_claim_token: string | null;
          dispatch_claimed_at: string | null;
          created_at: string;
          updated_at: string;
          dispatched_at: string | null;
        };
        Insert: {
          id?: string;
          provider: string;
          event_id: string;
          status?: "received" | "dispatch_failed" | "dispatched";
          raw_payload?: Record<string, unknown> | null;
          dispatch_error?: string | null;
          dispatch_claim_token?: string | null;
          dispatch_claimed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          dispatched_at?: string | null;
        };
        Update: {
          id?: string;
          provider?: string;
          event_id?: string;
          status?: "received" | "dispatch_failed" | "dispatched";
          raw_payload?: Record<string, unknown> | null;
          dispatch_error?: string | null;
          dispatch_claim_token?: string | null;
          dispatch_claimed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          dispatched_at?: string | null;
        };
        Relationships: [];
      };
      stripe_product_config: {
        Row: {
          product_id: string;
          tax_code: string | null;
          tax_behavior: "exclusive" | "inclusive" | "unspecified" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          product_id: string;
          tax_code?: string | null;
          tax_behavior?: "exclusive" | "inclusive" | "unspecified" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          product_id?: string;
          tax_code?: string | null;
          tax_behavior?: "exclusive" | "inclusive" | "unspecified" | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      jobs: {
        Row: {
          id: string;
          user_id: string | null;
          type: string;
          status: "queued" | "processing" | "completed" | "failed";
          progress: number | null;
          input: Record<string, unknown> | null;
          result: Record<string, unknown> | null;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          type: string;
          status?: "queued" | "processing" | "completed" | "failed";
          progress?: number | null;
          input?: Record<string, unknown> | null;
          result?: Record<string, unknown> | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          type?: string;
          status?: "queued" | "processing" | "completed" | "failed";
          progress?: number | null;
          input?: Record<string, unknown> | null;
          result?: Record<string, unknown> | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_health_profiles: {
        Row: {
          user_id: string;
          age: number;
          gender: "male" | "female";
          weight_kg: number;
          height_cm: number;
          activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
          goal: "lose" | "maintain" | "gain";
          dietary_preferences: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          age: number;
          gender: "male" | "female";
          weight_kg: number;
          height_cm: number;
          activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
          goal: "lose" | "maintain" | "gain";
          dietary_preferences?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          age?: number;
          gender?: "male" | "female";
          weight_kg?: number;
          height_cm?: number;
          activity_level?: "sedentary" | "light" | "moderate" | "active" | "very_active";
          goal?: "lose" | "maintain" | "gain";
          dietary_preferences?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meal_plans: {
        Row: {
          id: string;
          user_id: string;
          job_id: string | null;
          bmr: number;
          tdee: number;
          daily_calories: number;
          status: "generating" | "ready" | "failed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id?: string | null;
          bmr: number;
          tdee: number;
          daily_calories: number;
          status: "generating" | "ready" | "failed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          job_id?: string | null;
          bmr?: number;
          tdee?: number;
          daily_calories?: number;
          status?: "generating" | "ready" | "failed";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_deliveries: {
        Row: {
          id: string;
          dedupe_key: string;
          email_type: string;
          provider: string | null;
          provider_event_id: string | null;
          job_id: string;
          status: "pending" | "sent" | "failed";
          sent_email_id: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          dedupe_key: string;
          email_type: string;
          provider?: string | null;
          provider_event_id?: string | null;
          job_id: string;
          status?: "pending" | "sent" | "failed";
          sent_email_id?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          dedupe_key?: string;
          email_type?: string;
          provider?: string | null;
          provider_event_id?: string | null;
          job_id?: string;
          status?: "pending" | "sent" | "failed";
          sent_email_id?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
          sent_at?: string | null;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type ProfilesRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfilesInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfilesUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type AdminUsersRow = Database["public"]["Tables"]["admin_users"]["Row"];
export type AdminUsersInsert =
  Database["public"]["Tables"]["admin_users"]["Insert"];
export type AdminUsersUpdate =
  Database["public"]["Tables"]["admin_users"]["Update"];
