import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(
      "h-[44px] w-full rounded-md border border-hairline-strong bg-canvas px-4 text-body-sm text-ink placeholder:text-stone transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
      className,
    )} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(
      "w-full rounded-md border border-hairline-strong bg-canvas p-4 text-body-sm text-ink placeholder:text-stone transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
      className,
    )} rows={4} {...props} />
  ),
);
Textarea.displayName = "Textarea";
