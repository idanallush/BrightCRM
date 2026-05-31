"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      dir="rtl"
      position="bottom-left"
      toastOptions={{
        style: {
          fontFamily: "var(--font-almoni), system-ui, -apple-system, sans-serif",
          textAlign: "right",
        },
      }}
    />
  );
}

export { toast } from "sonner";
