import * as React from "react";
import { cn } from "@/lib/utils";

const buttonStyles = {
  variant: {
    default: "bg-[#1976D2] text-white hover:bg-[#1562AF] active:bg-[#0C3B69] shadow-xs border border-transparent focus-visible:ring-2 focus-visible:ring-[#D1E4F6] focus-visible:ring-offset-1",
    primary: "bg-[#1976D2] text-white hover:bg-[#1562AF] active:bg-[#0C3B69] shadow-xs border border-transparent focus-visible:ring-2 focus-visible:ring-[#D1E4F6] focus-visible:ring-offset-1",
    secondary: "bg-white text-[#1976D2] border border-[#B2D1F0] hover:bg-[#F0F6FC] hover:border-[#1976D2] active:bg-[#D1E4F6] shadow-xs",
    outline: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 shadow-xs",
    ghost: "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border-transparent",
    destructive: "bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] shadow-xs border border-transparent",
    link: "text-[#1976D2] underline-offset-4 hover:underline hover:text-[#1562AF] p-0 h-auto bg-transparent border-transparent shadow-none",
    unstyled: "",
  },
  size: {
    default: "h-10 px-4 py-2 rounded-xl text-sm",
    sm: "h-8 px-3 py-1 rounded-lg text-xs",
    lg: "h-11 px-6 py-2.5 rounded-xl text-base",
    icon: "h-9 w-9 p-0 rounded-xl",
    unstyled: "",
  }
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonStyles.variant;
  size?: keyof typeof buttonStyles.size;
  asChild?: boolean;
}

export function buttonVariants(options: {
  variant?: keyof typeof buttonStyles.variant;
  size?: keyof typeof buttonStyles.size;
  className?: string;
} = {}): string {
  const { variant = "default", size = "default", className } = options;

  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-150 select-none cursor-pointer disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    buttonStyles.variant[variant] || buttonStyles.variant.default,
    buttonStyles.size[size] || buttonStyles.size.default,
    className
  );
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    if (asChild) {
      return (
        <React.Fragment>
          {React.Children.map(props.children, child => {
            if (React.isValidElement(child)) {
              return (
                <span className={buttonVariants({ variant, size, className })}>
                  {child}
                </span>
              );
            }
            return child;
          })}
        </React.Fragment>
      );
    }

    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
