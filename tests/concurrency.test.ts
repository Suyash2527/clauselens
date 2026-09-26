import { describe, expect, it, vi } from "vitest";
import { runWithConcurrency } from "@/lib/concurrency";

describe("runWithConcurrency", () => {
  it("never exceeds the concurrency limit", async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    const task = vi.fn(async (id: number) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      
      // Simulate async work
      await new Promise((resolve) => setTimeout(resolve, 10));
      
      inFlight--;
      return id * 2;
    });

    const items = Array.from({ length: 10 }, (_, i) => i);
    
    const results = await runWithConcurrency(items, 3, task);
    
    expect(maxInFlight).toBeLessThanOrEqual(3);
    expect(results).toEqual(items.map((i) => i * 2));
    expect(task).toHaveBeenCalledTimes(10);
  });
});
