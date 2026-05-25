"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function PageViewTracker({ page }: { page: string }) {
  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      sb.from("page_views").insert({ user_id: user.id, page }).then(() => {});
    });
  }, [page]);

  return null;
}
