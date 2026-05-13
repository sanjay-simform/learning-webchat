import { motion } from "motion/react";
import { cn } from "../lib/cn";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "success" | "danger" | "warning";
  className?: string;
}

export const Badge = ({
  children,
  variant = "primary",
  className,
}: BadgeProps) => {
  const variantClasses = {
    primary: "badge-primary",
    success: "badge-success",
    danger: "badge-danger",
    warning: "badge bg-semantic-warning bg-opacity-20 text-semantic-warning",
  };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(variantClasses[variant], className)}
    >
      {children}
    </motion.span>
  );
};
