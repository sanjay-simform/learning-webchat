import { motion } from "motion/react";
import { cn } from "../lib/cn";

interface InputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  icon?: React.ReactNode;
  actionButton?: React.ReactNode;
}

export const ChatInput = ({
  icon,
  actionButton,
  className,
  ...props
}: InputProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-end gap-3 bg-elevated rounded-chat p-3 border border-obsidian-500 border-opacity-30 transition-all focus-within:border-accent-cyan focus-within:border-opacity-50"
    >
      {icon && <div className="text-text-secondary flex-shrink-0">{icon}</div>}
      <textarea
        className={cn(
          "flex-1 bg-transparent text-primary placeholder-text-muted resize-none outline-none text-sm",
          className,
        )}
        rows={1}
        {...props}
      />
      {actionButton && <div className="flex-shrink-0">{actionButton}</div>}
    </motion.div>
  );
};
