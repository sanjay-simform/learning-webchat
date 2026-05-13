import { motion } from "motion/react";
import { cn } from "../lib/cn";

interface AvatarProps {
  initials: string;
  size?: "sm" | "md" | "lg";
  color?: "cyan" | "violet" | "amber" | "rose";
  className?: string;
}

export const Avatar = ({
  initials,
  size = "md",
  color = "cyan",
  className,
}: AvatarProps) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const colorClasses = {
    cyan: "bg-accent-cyan bg-opacity-20 text-accent-cyan",
    violet: "bg-accent-violet bg-opacity-20 text-accent-violet",
    amber: "bg-accent-amber bg-opacity-20 text-accent-amber",
    rose: "bg-accent-rose bg-opacity-20 text-accent-rose",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center justify-center font-medium rounded-full",
        sizeClasses[size],
        colorClasses[color],
        className,
      )}
    >
      {initials}
    </motion.div>
  );
};
