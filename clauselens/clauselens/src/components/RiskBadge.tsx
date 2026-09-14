import type { Severity } from "@/lib/types";

const LABELS: Record<Severity, string> = {
  high: "Needs attention",
  medium: "Worth reading",
  low: "Routine",
};

export function RiskBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`badge badge--${severity}`}>
      {/* Text carries the meaning, so the badge is legible without colour. */}
      {LABELS[severity]}
    </span>
  );
}
