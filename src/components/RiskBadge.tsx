import type { Severity } from "@/lib/types";

const SEVERITY_LABELS: Record<Severity, string> = {
  high: "Needs attention",
  medium: "Worth reading",
  low: "Routine",
};

/** Severity label; worded as advice to read, not a verdict on the clause. */
export function RiskBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`badge badge--${severity}`}>
      {/* Text carries the meaning, so the badge is legible without colour. */}
      {SEVERITY_LABELS[severity]}
    </span>
  );
}
