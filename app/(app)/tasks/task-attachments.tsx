"use client";

import * as React from "react";
import { FileList } from "@/components/file-list";
import { FileUpload } from "@/components/file-upload";
import { listForTask, type Attachment } from "@/app/actions/attachments";

export function TaskAttachments({ taskId }: { taskId: string }) {
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [thumbs, setThumbs] = React.useState<Record<string, string | null>>({});
  const [loading, setLoading] = React.useState(true);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { attachments: a, thumbs: t } = await listForTask(taskId);
      if (cancelled) return;
      setAttachments(a);
      setThumbs(t);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId, tick]);

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium text-[color:var(--color-ink-muted)]">
        קבצים ({attachments.length})
      </h4>
      <FileUpload taskId={taskId} onUploaded={() => setTick((n) => n + 1)} />
      {loading ? (
        <div className="text-xs text-[color:var(--color-ink-muted)]">טוען...</div>
      ) : (
        <FileList
          attachments={attachments}
          thumbUrls={thumbs}
          onChange={() => setTick((n) => n + 1)}
        />
      )}
    </div>
  );
}
