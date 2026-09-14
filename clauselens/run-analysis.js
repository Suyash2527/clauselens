/* eslint-disable */
const fs = require('fs');

async function run(file, p1, p2) {
  const text = fs.readFileSync(file, 'utf8');

  for (const p of [p1, p2]) {
    console.log(`\n=== PERSPECTIVE: ${p.toUpperCase()} ===`);
    const res = await fetch('http://127.0.0.1:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, perspective: p })
    });
    const data = await res.json();
    if (!res.ok) {
      console.log(`Error for ${p}:`, JSON.stringify(data));
      continue;
    }
    
    console.log("Clause No | Category | BurdenScore | Severity");
    console.log("-------------------------------------------------");
    
    let high = 0, medium = 0, low = 0;
    
    // Sort by id naturally if possible, or just iterate
    for (const [id, clause] of Object.entries(data.clauses)) {
      console.log(`${id.padEnd(9)} | ${clause.analysis.category.padEnd(12)} | ${clause.analysis.burdenScore.toString().padEnd(11)} | ${clause.severity}`);
      if (clause.severity === 'high') high++;
      if (clause.severity === 'medium') medium++;
      if (clause.severity === 'low') low++;
    }
    console.log(`\nTotals: High: ${high}, Medium: ${medium}, Low: ${low}\n`);
  }
}

const file = process.argv[2];
const p1 = process.argv[3];
const p2 = process.argv[4];
run(file, p1, p2).catch(console.error);
