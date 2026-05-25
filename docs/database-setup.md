# Database Setup

This project includes database migrations and TypeScript types.

## Quick Start

1. Set up your Supabase project:
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key to `.env.local`

2. Apply the database migrations:
   - Option A: Copy the SQL from `supabase/migrations/` and run in Supabase SQL Editor
   - Option B: Use the Supabase CLI:
     ```bash
     supabase init
     supabase link --project-ref your-project-ref
     supabase db push
     ```

3. Row Level Security (RLS):
   - RLS policies are included based on your table access configuration
   - Policies enforce owner/authenticated/public access as specified
   - Review the policies in your migration file

## Project Files

- `supabase/migrations/` - SQL migration files
- `src/lib/supabase/database.types.ts` - TypeScript type definitions

## Using the Types

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfilesRow } from "@/lib/supabase/database.types";

// Example: Get the current user's profile
const supabase = await createSupabaseServerClient();
const { data } = await supabase.from("profiles").select("*").single();

// Type-safe operations
type Profile = ProfilesRow;
```
