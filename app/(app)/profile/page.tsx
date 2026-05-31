import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "./profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  const { data: member } = user
    ? await sb
        .from("team_members")
        .select(
          "id, full_name, role, email, whatsapp_phone, avatar_url, notify_email, notify_whatsapp",
        )
        .eq("email", user.email)
        .maybeSingle()
    : { data: null };

  if (!member) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-ink">הפרופיל שלי</h1>
        <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-elevation-1">
          <p className="text-body-sm text-ink-muted">
            לא נמצאה רשומת משתמש המשויכת לחשבון שלך.
          </p>
        </div>
      </div>
    );
  }

  return <ProfileClient member={member} />;
}
