import { describe, it, expect, vi } from "vitest";
import { getDemoClient } from "../src/lib/gemini/demo-provider";
import { clauseBatchResponseSchema } from "../src/lib/gemini/schemas";
import { classificationUserPrompt } from "../src/lib/gemini/prompts";
import { z } from "zod";
import { clauseAnalysisSchema } from "../src/lib/types";

// The sample button populating the textarea is typically an E2E test or component test.
// Since we only have vitest set up for lib logic, we will test the demo client schema validity.
const batchSchema = z.object({ clauses: z.array(clauseAnalysisSchema) });

describe("Demo Provider", () => {
  it("returns schema-valid output for classification", async () => {
    const ai = getDemoClient();
    const contents = classificationUserPrompt([
      { id: "chunk-1", text: "Sample text" },
      { id: "chunk-2", text: "Another text" }
    ]);

    const response = await ai.models.generateContent({
      model: "test-model",
      contents,
      config: {
        responseSchema: clauseBatchResponseSchema,
      }
    });

    const parsed = JSON.parse(response.text ?? "{}");
    const validated = batchSchema.safeParse(parsed);
    
    expect(validated.success).toBe(true);
    if (validated.success && validated.data) {
      expect(validated.data.clauses.length).toBeGreaterThan(0);
      expect(validated.data.clauses[0]?.id).toBe("chunk-1");
    }
  });
});

import { DocumentInput } from "../src/components/DocumentInput";
import React from "react";
global.React = React;

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useRef: vi.fn(() => ({ current: null })),
    useEffect: vi.fn(),
  };
});

describe("DocumentInput Sample Button", () => {
  it("populates textarea when sample document button is clicked", () => {
    const setText = vi.fn();
    
    const element = DocumentInput({
      text: "",
      setText,
      pendingUpload: null,
      extractedFile: null,
      extractedCount: null,
      extracting: false,
      pending: false,
      error: null,
      onFileChange: vi.fn(),
      onCancelUpload: vi.fn(),
      onConfirmUpload: vi.fn(),
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const findButton = (node: any): any => {
      if (!node) return null;
      if (node.type === "button" && node.props?.children === "Try a sample document") return node;
      if (Array.isArray(node)) {
        for (const child of node) {
          const found = findButton(child);
          if (found) return found;
        }
      }
      if (node.props?.children) {
        return findButton(node.props.children);
      }
      return null;
    };
    
    // Since DocumentInput returns a Fragment, we search its children
    const button = findButton(element.props.children);
    expect(button).toBeTruthy();
    
    button?.props?.onClick?.();
    
    expect(setText).toHaveBeenCalled();
    expect(setText.mock.calls[0]?.[0]).toContain("RENTAL AGREEMENT");
  });
});
