import { cn } from "../lib/cn";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const FormInput = ({
  label,
  error,
  icon,
  className,
  ...props
}: FormInputProps) => {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="label-text">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            {icon}
          </div>
        )}
        <input
          className={cn(
            "chat-input w-full transition-all",
            icon && "pl-10",
            error &&
              "border-semantic-danger border-opacity-50 focus:ring-semantic-danger",
          )}
          {...props}
        />
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
};
