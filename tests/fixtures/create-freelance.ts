import * as fs from "fs";

const text = `
FREELANCE CONTRACTOR AGREEMENT

1. REVISIONS: The Contractor agrees to provide unlimited free revisions to the work until the Client is completely satisfied, without any additional compensation.
2. PAYMENT: The Client shall pay the Contractor within 90 days of receiving a valid invoice. However, the Client reserves the right to withhold payment at its sole discretion if it deems the work unsatisfactory.
3. INTELLECTUAL PROPERTY: All intellectual property rights in the work shall vest in the Client immediately upon creation, regardless of whether payment has been made to the Contractor.
4. PORTFOLIO: The Contractor is strictly prohibited from displaying the work in their portfolio, website, or marketing materials, under any circumstances.
5. EXCLUSIVITY: For a period of 12 months following the termination of this agreement, the Contractor shall not provide similar services to any other client operating in the same sector.
6. INDEMNITY: The Contractor shall indemnify and hold the Client harmless from any and all claims, damages, liabilities, and expenses arising out of the Contractor's performance of the work, without any cap on liability.
7. TERMINATION: The Client may terminate this agreement at any time for any reason. In the event of early termination, no payment shall be made for any partial work completed by the Contractor.
`;

fs.writeFileSync("d:/promptwars/vip_version/tests/fixtures/freelance-agreement.txt", text);
console.log("Written test file.");
