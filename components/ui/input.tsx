import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-md border border-[color:var(--color-hairline)] bg-white px-3 text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-muted)] focus:border-[color:var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-focus)]/30",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-md border border-[color:var(--color-hairline)] bg-white p-3 text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-muted)] focus:border-[color:var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-focus)]/30",
      className,
    )}
    rows={4}
    {...props}
  />
));
Textarea.displayName = "Textarea";
