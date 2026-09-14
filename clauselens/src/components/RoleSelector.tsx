"use client";

import { PERSPECTIVES, type Perspective } from "@/lib/types";

const LABELS: Record<Perspective, string> = {
  tenant: "I am the tenant",
  landlord: "I am the landlord",
  employee: "I am the employee",
  employer: "I am the employer",
  freelancer: "I am the freelancer or contractor",
  client: "I am the client hiring",
};

interface Props {
  value: Perspective;
  onChange: (value: Perspective) => void;
  disabled: boolean;
}

export function RoleSelector({ value, onChange, disabled }: Props) {
  return (
    <div>
      <label className="label" htmlFor="perspective">
        Your side of the agreement
      </label>
      <p id="perspective-help" style={{ margin: "0.35rem 0 0.6rem", color: "var(--ink-soft)" }}>
        The same clause is a risk for one side and a protection for the other. Pick yours.
      </p>
      <select
        id="perspective"
        aria-describedby="perspective-help"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as Perspective)}
      >
        {PERSPECTIVES.map((perspective) => (
          <option key={perspective} value={perspective}>
            {LABELS[perspective]}
          </option>
        ))}
      </select>
    </div>
  );
}
