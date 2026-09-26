import * as fs from "fs";

async function main() {
  const text = fs.readFileSync("d:/promptwars/vip_version/tests/fixtures/freelance-agreement.txt", "utf-8");

  for (const perspective of ["freelancer", "client"]) {
    const res = await fetch("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, perspective })
    });
    const data = await res.json();

    if (data.error) {
      console.error(perspective, "Error:", data.error);
      continue;
    }

    console.log(`\n=== ${perspective.toUpperCase()} ===`);
    let high = 0, medium = 0, low = 0;
    data.clauses.forEach((c: any) => {
      if (c.severity === "high") high++;
      else if (c.severity === "medium") medium++;
      else low++;
    });
    console.log(`High: ${high}, Medium: ${medium}, Low: ${low}`);
    data.clauses.forEach((c: any) => {
      console.log(`[${c.severity.toUpperCase()}] ${c.id}: ${c.analysis.plainSummary}`);
    });
  }
}
main().catch(console.error);
