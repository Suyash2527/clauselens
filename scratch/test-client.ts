import * as fs from "fs";

async function main() {
  const text = fs.readFileSync("d:/promptwars/vip_version/tests/fixtures/freelance-agreement.txt", "utf-8");

  const res = await fetch("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, perspective: "client" })
  });
  const data = await res.json();

  console.log(`\n=== CLIENT ===`);
  data.clauses.forEach((c: any) => {
    console.log(`[${c.severity.toUpperCase()}] ${c.id}: (Burden: ${c.analysis.burdenScore}, Category: ${c.analysis.category}, Concerns: ${c.analysis.concerns.length})`);
  });
}
main().catch(console.error);
