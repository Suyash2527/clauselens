"use client";

import { PERSPECTIVES, type Perspective } from "@/lib/types";

const LABELS: Record<Perspective, { title: string; desc: string }> = {
  tenant: { title: "Tenant", desc: "I am renting the property" },
  landlord: { title: "Landlord", desc: "I am renting out my property" },
  employee: { title: "Employee", desc: "I am being hired" },
  employer: { title: "Employer", desc: "I am hiring an employee" },
  freelancer: { title: "Freelancer", desc: "I am working as a freelancer" },
  client: { title: "Client", desc: "I am hiring a freelancer" },
};

interface Props {
  value: Perspective;
  onChange: (value: Perspective) => void;
  disabled: boolean;
}

export function RoleSelector({ value, onChange, disabled }: Props) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="label" style={{ padding: 0, marginBottom: "0.5rem" }}>
        Your side of the agreement
      </legend>
      <div className="role-grid">
        {PERSPECTIVES.map((perspective) => {
          const isActive = value === perspective;
          return (
            <label
              key={perspective}
              className={`role-card ${isActive ? "role-card--active" : ""}`}
            >
              <input
                type="radio"
                name="perspective"
                className="role-card-input"
                value={perspective}
                checked={isActive}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value as Perspective)}
              />
              <div className="role-card-content">
                <div className="role-card-title">{LABELS[perspective].title}</div>
                <p className="role-card-desc">{LABELS[perspective].desc}</p>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
