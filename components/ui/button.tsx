"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "rounded-md bg-primary text-white shadow-subtle hover:bg-primary-pressed text-button",
        dark: "rounded-md bg-ink-deep text-white shadow-subtle hover:bg-navy-mid text-button",
        secondary: "rounded-md border border-hairline-strong bg-canvas text-ink hover:bg-surface text-button",
        ghost: "rounded-sm bg-transparent text-ink hover:bg-surface text-button",
        danger: "rounded-md bg-overdue text-white shadow-subtle hover:opacity-90 text-button",
        link: "bg-transparent text-link p-0 text-body-sm hover:underline",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-[18px] py-[10px]",
        lg: "h-12 px-6 text-body-md",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  },
);
Button.displayName = "Button";
export { buttonVariants };
