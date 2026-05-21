import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Use ONLY in server-to-server contexts
// (webhooks, cron jobs, scripts). Never import from client components.
export function createAdminClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
