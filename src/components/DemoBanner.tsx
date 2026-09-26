"use client";

import { useEffect, useState } from "react";

export function DemoBanner() {
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.demo) setDemo(true);
      })
      .catch(() => {});
  }, []);

  if (!demo) return null;

  return (
    <div style={{ background: "var(--amber)", color: "#000", padding: "0.5rem", textAlign: "center", fontWeight: 500, fontSize: "0.9rem" }}>
      Demo mode — showing sample analysis. Add a Gemini API key for live results.
    </div>
  );
}
