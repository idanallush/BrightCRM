"use client";

import * as React from "react";

const MAX_BYTES = 10 * 1024 * 1024; // matches attachment upload limit
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "png";
}

export type UsePasteImageOptions = {
  onImages: (files: File[]) => void;
  onTooLarge?: (file: File) => void;
  onUnsupported?: (mime: string) => void;
};

// Returns an onPaste handler that intercepts image paste events.
// Falls through to default browser behavior when no images are present (text paste stays untouched).
export function usePasteImage({ onImages, onTooLarge, onUnsupported }: UsePasteImageOptions) {
  const cb = React.useRef(onImages);
  const tooLargeCb = React.useRef(onTooLarge);
  const unsupportedCb = React.useRef(onUnsupported);
  React.useEffect(() => {
    cb.current = onImages;
    tooLargeCb.current = onTooLarge;
    unsupportedCb.current = onUnsupported;
  });

  return React.useCallback((e: React.ClipboardEvent<HTMLElement>) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind !== "file") continue;
      const mime = it.type || "";
      if (!mime.startsWith("image/")) continue;
      const f = it.getAsFile();
      if (!f) continue;

      if (!ALLOWED_IMAGE_TYPES.includes(mime)) {
        unsupportedCb.current?.(mime);
        continue;
      }
      if (f.size > MAX_BYTES) {
        tooLargeCb.current?.(f);
        continue;
      }
      // Clipboard images often have generic names like "image.png" or none. Give them stable names.
      const ext = extFromMime(mime);
      const named = f.name && f.name !== "image.png"
        ? f
        : new File([f], `pasted-${Date.now()}-${i}.${ext}`, { type: mime });
      files.push(named);
    }

    if (files.length === 0) return;
    e.preventDefault();
    cb.current(files);
  }, []);
}
