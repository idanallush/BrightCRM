import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(
      "h-10 w-full rounded-md border border-border bg-white px-3 text-body-sm text-ink placeholder:text-ink-muted transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20",
      className,
    )} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(
      "w-full rounded-md border border-border bg-white p-3 text-body-sm text-ink placeholder:text-ink-muted transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20",
      className,
    )} rows={4} {...props} />
  ),
);
Textarea.displayName = "Textarea";
