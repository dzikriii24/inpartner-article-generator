import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#D1E4F6]",
  {
    variants: {
      variant: {
        default: "bg-[#D1E4F6] text-[#0C3B69] border-[#B2D1F0]",
        primary: "bg-[#D1E4F6] text-[#0C3B69] border-[#B2D1F0]",
        secondary: "bg-slate-100 text-slate-700 border-slate-200",
        destructive: "bg-rose-50 text-rose-700 border-rose-200",
        outline: "bg-white text-slate-700 border-slate-200",
        success: "bg-emerald-50 text-emerald-700 border-emerald-200",
        warning: "bg-amber-50 text-amber-700 border-amber-200",
        info: "bg-sky-50 text-sky-700 border-sky-200",
        unstyled: "",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.2 text-[10px]",
        lg: "px-3 py-1 text-sm",
        unstyled: "",
      },
      shape: {
        default: "rounded-full",
        square: "rounded-md",
        rounded: "rounded-lg",
        unstyled: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  withDot?: boolean;
  dotColor?: string;
  interactive?: boolean;
  highlighted?: boolean;
}

function Badge({ 
  className, 
  variant, 
  size,
  shape,
  withDot,
  dotColor = "currentColor",
  interactive,
  highlighted,
  ...props 
}: BadgeProps) {
  return (
    <div 
      className={cn(
        badgeVariants({ variant, size, shape }), 
        interactive && "cursor-pointer hover:opacity-85",
        highlighted && "ring-2 ring-offset-2 ring-[#1976D2]",
        className
      )} 
      {...props}
    >
      {withDot && (
        <span 
          className="mr-1 h-1.5 w-1.5 rounded-full inline-block" 
          style={{ backgroundColor: dotColor }}
        />
      )}
      {props.children}
    </div>
  );
}

export { Badge, badgeVariants };
