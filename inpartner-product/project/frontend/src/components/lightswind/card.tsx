import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
}

const Card = React.forwardRef<
  HTMLDivElement,
  CardProps
>(({ className, hoverable = false, bordered = true, compact = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl bg-white text-slate-900 shadow-xs transition-all duration-200",
      bordered && "border border-slate-200",
      hoverable ? "hover:shadow-md hover:border-[#B2D1F0] hover:-translate-y-0.5" : "",
      compact ? "p-3 sm:p-4" : "p-0",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: "default" | "compact" | "relaxed";
}

const CardHeader = React.forwardRef<
  HTMLDivElement,
  CardHeaderProps
>(({ className, spacing = "default", ...props }, ref) => {
  const spacingClasses = {
    compact: "flex flex-col space-y-1 p-4",
    default: "flex flex-col space-y-1.5 p-6",
    relaxed: "flex flex-col space-y-2 p-8",
  };

  return (
    <div
      ref={ref}
      className={cn(spacingClasses[spacing], className)}
      {...props}
    />
  );
});
CardHeader.displayName = "CardHeader";

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  size?: "sm" | "default" | "lg";
}

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  CardTitleProps
>(({ className, as = "h3", size = "default", ...props }, ref) => {
  const Component = as;
  const sizeClasses = {
    sm: "text-lg",
    default: "text-xl",
    lg: "text-2xl"
  };

  return (
    <Component
      ref={ref}
      className={cn(
        "font-bold text-slate-900 leading-snug tracking-tight",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
CardTitle.displayName = "CardTitle";

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: "xs" | "sm" | "default";
}

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  CardDescriptionProps
>(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    default: "text-sm"
  };

  return (
    <p
      ref={ref}
      className={cn(
        "text-slate-500",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
CardDescription.displayName = "CardDescription";

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  removeTopPadding?: boolean;
  padding?: "none" | "sm" | "default" | "lg";
}

const CardContent = React.forwardRef<
  HTMLDivElement,
  CardContentProps
>(({ className, removeTopPadding = true, padding = "default", ...props }, ref) => {
  const paddingClasses = {
    none: "p-0",
    sm: "px-4 py-3",
    default: "p-6",
    lg: "p-8"
  };

  return (
    <div 
      ref={ref} 
      className={cn(
        paddingClasses[padding], 
        removeTopPadding && padding !== "none" ? "pt-0" : "",
        className
      )} 
      {...props}
    />
  );
});
CardContent.displayName = "CardContent";

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end" | "between" | "around";
  direction?: "row" | "column";
}

const CardFooter = React.forwardRef<
  HTMLDivElement,
  CardFooterProps
>(({ className, align = "center", direction = "row", ...props }, ref) => {
  const alignClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
    around: "justify-around"
  };

  const directionClasses = {
    row: "flex-row",
    column: "flex-col"
  };

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center p-6 pt-0",
        alignClasses[align],
        directionClasses[direction],
        className
      )}
      {...props}
    />
  );
});
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
