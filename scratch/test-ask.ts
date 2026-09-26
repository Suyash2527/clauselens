import * as fs from "fs";

async function main() {
  const text = fs.readFileSync("d:/promptwars/vip_version/tests/fixtures/freelance-agreement.txt", "utf-8");

  const res = await fetch("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, perspective: "freelancer" })
  });
  const data = await res.json();

  const askRes = await fetch("http://localhost:3000/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clauses: data.clauses, perspective: "freelancer", question: "What does this agreement say about providing me a laptop and software licenses?" })
  });
  const askData = await askRes.json();
  console.log("Q&A Answer:", askData.answer);
}
main().catch(console.error);
