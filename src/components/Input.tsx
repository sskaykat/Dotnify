import type { InputHTMLAttributes, Ref } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  inputRef?: Ref<HTMLInputElement>;
}

export function Input({ label, error, hint, className = "", id, inputRef, ...rest }: InputProps) {
  const inputId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        id={inputId}
        className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-700 ${
          error ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""
        } ${className}`}
        {...rest}
      />
      {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
