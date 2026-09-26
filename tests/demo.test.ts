import React from "react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { DocumentInput } from "@/components/DocumentInput";
import { getDemoClient } from "@/lib/gemini/demo-provider";
import { classificationUserPrompt } from "@/lib/gemini/prompts";
import { clauseBatchResponseSchema } from "@/lib/gemini/schemas";
import { clauseAnalysisSchema } from "@/lib/types";

// Only vitest is configured, so the component is called as a plain function
// with its hooks stubbed, and the returned element tree is searched directly.
global.React = React;

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useRef: vi.fn(() => ({ current: null })),
    useEffect: vi.fn(),
  };
});

const clauseBatchSchema = z.object({ clauses: z.array(clauseAnalysisSchema) });

interface ElementLike {
  type?: unknown;
  props?: { children?: unknown; onClick?: () => void };
}

function findButtonByLabel(node: unknown, label: string): ElementLike | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findButtonByLabel(child, label);
      if (found) return found;
    }
    return null;
  }
  const element = node as ElementLike;
  if (element.type === "button" && element.props?.children === label) return element;
  return element.props?.children ? findButtonByLabel(element.props.children, label) : null;
}

describe("Demo provider", () => {
  it("returns a schema-valid classification that echoes the prompt's clause ids", async () => {
    const ai = getDemoClient();
    const contents = classificationUserPrompt([
      { id: "chunk-1", text: "Sample text" },
      { id: "chunk-2", text: "Another text" },
    ]);

    const response = await ai.models.generateContent({
      model: "test-model",
      contents,
      config: { responseSchema: clauseBatchResponseSchema },
    });

    const validated = clauseBatchSchema.safeParse(JSON.parse(response.text ?? "{}"));
    expect(validated.success).toBe(true);
    if (validated.success) {
      expect(validated.data.clauses.length).toBeGreaterThan(0);
      expect(validated.data.clauses[0]?.id).toBe("chunk-1");
    }
  });
});

describe("DocumentInput sample button", () => {
  it("fills the textarea with the sample rental agreement when clicked", () => {
    const setText = vi.fn();

    const element = DocumentInput({
      text: "",
      setText,
      pendingUpload: null,
      extractedFile: null,
      extractedCharCount: null,
      extracting: false,
      analyzing: false,
      error: null,
      onFileChange: vi.fn(),
      onCancelUpload: vi.fn(),
      onConfirmUpload: vi.fn(),
    });

    // DocumentInput returns a Fragment, so search its children.
    const button = findButtonByLabel(element.props.children, "Try a sample document");
    expect(button).toBeTruthy();

    button?.props?.onClick?.();

    expect(setText).toHaveBeenCalled();
    expect(setText.mock.calls[0]?.[0]).toContain("RENTAL AGREEMENT");
  });
});
