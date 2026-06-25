import { ReactNode } from "react";

export function Field({ label, children, action }: { label: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        {action}
      </div>
      {children}
    </div>
  );
}

export const inputCls =
  "w-full px-4 py-2.5 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition placeholder:text-muted-foreground/60";
