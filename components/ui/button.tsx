"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "rounded-full bg-accent text-ink text-button shadow-elevation-1 hover:bg-accent/85 hover:-translate-y-px hover:shadow-elevation-2",
        secondary: "rounded-full border-2 border-border bg-white text-ink text-button hover:bg-surface hover:border-ink-muted hover:-translate-y-px hover:shadow-elevation-1",
        ghost: "rounded-xl text-ink text-button hover:bg-surface",
        danger: "rounded-full bg-overdue text-white text-button shadow-elevation-1 hover:opacity-90 hover:-translate-y-px hover:shadow-elevation-2",
        dark: "rounded-full bg-ink text-white text-button shadow-elevation-1 hover:bg-ink-hover hover:-translate-y-px hover:shadow-elevation-2",
        link: "bg-transparent text-primary p-0 text-body-sm hover:underline",
      },
      size: {
        sm: "h-8 px-4 text-[13px]",
        md: "h-10 px-5",
        lg: "h-12 px-7",
        icon: "h-9 w-9 rounded-xl",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} disabled={disabled || loading} {...props}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";
export { buttonVariants };
