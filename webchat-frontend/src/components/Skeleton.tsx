import { cn } from "../lib/cn";

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => {
  return (
    <div
      className={cn(
        "animate-pulse bg-obsidian-500 bg-opacity-40 rounded",
        className,
      )}
    />
  );
};

interface SkeletonCircleProps {
  size?: "sm" | "md" | "lg";
}

export const SkeletonCircle = ({ size = "md" }: SkeletonCircleProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-24 h-24",
  };

  return (
    <div
      className={cn(
        "animate-pulse bg-obsidian-500 bg-opacity-40 rounded-full",
        sizeClasses[size],
      )}
    />
  );
};

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText = ({ lines = 1, className }: SkeletonTextProps) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 && "w-3/4", className)}
        />
      ))}
    </div>
  );
};
