"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "attachments";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // legacy office types — accept them too
  "application/msword",
  "application/vnd.ms-excel",
];

export type Attachment = {
  id: string;
  file_name: string;
  file_size: number | null;
  content_type: string | null;
  storage_path: string;
  client_id: string | null;
  task_id: string | null;
  uploaded_by: string | null;
  uploader_name: string | null;
  created_at: string;
};

export async function uploadAttachment(formData: FormData) {
  const file = formData.get("file") as File | null;
  const clientId = (formData.get("clientId") as string | null) || null;
  const taskId = (formData.get("taskId") as string | null) || null;

  if (!file) return { error: "לא נשלח קובץ" };
  if (!clientId && !taskId) return { error: "חסר שיוך (לקוח או משימה)" };
  if (file.size > MAX_BYTES) return { error: "הקובץ גדול מ-10MB" };
  if (!ALLOWED.includes(file.type)) return { error: `סוג קובץ לא נתמך: ${file.type}` };

  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "לא מאומת" };

  // Resolve team_members.id from the auth user's email (RLS reads JWT).
  const { data: member } = await sb
    .from("team_members")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();

  const folder = clientId ? `client/${clientId}` : `task/${taskId}`;
  const ext = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
    : "";
  const path = `${folder}/${crypto.randomUUID()}${ext}`;

  const { error: upErr } = await sb.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { error: `העלאה נכשלה: ${upErr.message}` };

  const { error: insErr } = await sb.from("attachments").insert({
    file_name: file.name,
    file_size: file.size,
    content_type: file.type,
    storage_path: path,
    client_id: clientId,
    task_id: taskId,
    uploaded_by: member?.id ?? null,
  });
  if (insErr) {
    // Roll back the uploaded object so we don't orphan storage.
    await sb.storage.from(BUCKET).remove([path]);
    return { error: `שמירת רשומה נכשלה: ${insErr.message}` };
  }

  if (clientId) {
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/clients");
  }
  if (taskId) {
    revalidatePath("/tasks");
  }
  return { ok: true as const };
}

export async function deleteAttachment(id: string) {
  const sb = createClient();
  const { data: row, error: getErr } = await sb
    .from("attachments")
    .select("storage_path,client_id,task_id")
    .eq("id", id)
    .maybeSingle();
  if (getErr || !row) return { error: "הקובץ לא נמצא" };

  const { error: rmErr } = await sb.storage.from(BUCKET).remove([row.storage_path]);
  if (rmErr) return { error: `מחיקה מ-Storage נכשלה: ${rmErr.message}` };

  const { error: delErr } = await sb.from("attachments").delete().eq("id", id);
  if (delErr) return { error: delErr.message };

  if (row.client_id) revalidatePath(`/clients/${row.client_id}`);
  if (row.task_id) revalidatePath("/tasks");
  return { ok: true as const };
}

export async function getSignedDownloadUrl(id: string) {
  const sb = createClient();
  const { data: row } = await sb
    .from("attachments")
    .select("storage_path,file_name")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "לא נמצא" };

  const { data, error } = await sb.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, 60, { download: row.file_name });
  if (error || !data) return { error: error?.message ?? "לא ניתן ליצור קישור" };
  return { ok: true as const, url: data.signedUrl };
}

export async function getSignedThumbnailUrl(storagePath: string) {
  const sb = createClient();
  const { data } = await sb.storage.from(BUCKET).createSignedUrl(storagePath, 600);
  return data?.signedUrl ?? null;
}

export async function listForTask(taskId: string) {
  const { getAttachmentsForTask } = await import("@/lib/data");
  const list = await getAttachmentsForTask(taskId);
  const thumbs: Record<string, string | null> = {};
  await Promise.all(
    list
      .filter((a) => a.content_type?.startsWith("image/"))
      .map(async (a) => {
        thumbs[a.storage_path] = await getSignedThumbnailUrl(a.storage_path);
      }),
  );
  return { attachments: list, thumbs };
}
