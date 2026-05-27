"use client";

import * as React from "react";
import { FileList } from "@/components/file-list";
import { FileUpload } from "@/components/file-upload";
import { listForTask, type Attachment } from "@/app/actions/attachments";

export function TaskAttachments({
  taskId,
  onCountChange,
}: {
  taskId: string;
  onCountChange?: (count: number) => void;
}) {
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
      onCountChange?.(a.length);
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId, tick]);

  const bump = () => setTick((n) => n + 1);

  return (
    <div className="flex flex-col gap-2">
      <FileUpload taskId={taskId} onUploaded={bump} />
      {loading ? (
        <div className="text-xs text-ink-muted">טוען...</div>
      ) : (
        <FileList attachments={attachments} thumbUrls={thumbs} onChange={bump} />
      )}
    </div>
  );
}
