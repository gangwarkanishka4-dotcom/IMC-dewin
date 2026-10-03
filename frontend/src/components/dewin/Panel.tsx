import type { LucideIcon } from "lucide-react";
import { AlertCircle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

/** The Dashboard's section card: blue icon badge + navy title, actions on the right. */
export function Panel({
  icon: Icon,
  title,
  actions,
  children,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5 ${className}`}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue text-primary-foreground">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <h2 className="text-lg font-bold text-navy sm:text-xl">{title}</h2>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-navy">{value}</p>
      {hint && <p className="mt-1 text-xs font-medium text-text-secondary">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-brand-blue-tint px-6 py-12 text-center">
      <Icon className="h-7 w-7 text-brand-blue" />
      <p className="text-sm font-semibold text-navy">{title}</p>
      {children && <p className="max-w-md text-xs font-medium text-text-secondary">{children}</p>}
    </div>
  );
}

/** Loading / error placeholder for a react-query result. */
export function QueryState({ isLoading, error }: { isLoading: boolean; error: unknown }) {
  if (isLoading)
    return (
      <div className="flex items-center gap-2 py-10 text-sm font-medium text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  if (error)
    return (
      <div className="flex items-center gap-2 rounded-xl bg-pink-soft px-4 py-3 text-sm font-medium text-pink">
        <AlertCircle className="h-4 w-4" />
        {error instanceof Error ? error.message : "Could not reach the Deco Vision backend"}
      </div>
    );
  return null;
}
