"use client";

import { PERSPECTIVES, type Perspective } from "@/lib/types";

const ROLE_LABELS: Record<Perspective, { title: string; description: string }> = {
  tenant: { title: "Tenant", description: "I am renting the property" },
  landlord: { title: "Landlord", description: "I am renting out my property" },
  employee: { title: "Employee", description: "I am being hired" },
  employer: { title: "Employer", description: "I am hiring an employee" },
  freelancer: { title: "Freelancer", description: "I am working as a freelancer" },
  client: { title: "Client", description: "I am hiring a freelancer" },
};

interface RoleSelectorProps {
  value: Perspective;
  onChange: (value: Perspective) => void;
  disabled: boolean;
}

/** Radio group over `PERSPECTIVES`; every later score is relative to this choice. */
export function RoleSelector({ value, onChange, disabled }: RoleSelectorProps) {
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
                <div className="role-card-title">{ROLE_LABELS[perspective].title}</div>
                <p className="role-card-desc">{ROLE_LABELS[perspective].description}</p>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
