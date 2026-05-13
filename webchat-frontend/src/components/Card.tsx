import { motion } from "motion/react";
import { cn } from "../lib/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className }: CardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className={cn("chat-card p-6 space-y-4", className)}
    >
      {children}
    </motion.div>
  );
};
