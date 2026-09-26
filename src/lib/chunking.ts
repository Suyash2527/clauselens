import type { ClauseChunk } from "./types";

const MIN_CLAUSE_CHARS = 40;
const MAX_CLAUSE_CHARS = 4_000;

/**
 * Matches the numbering styles used by the agreements this tool targets:
 * "1.", "1.2", "(a)", "Section 4", "ARTICLE III", "WHEREAS".
 */
const CLAUSE_START = /^\s*(?:\(?[a-z0-9]{1,4}[.)]|section\s+\d+[.)]?|article\s+[ivx\d]+[.)]?|whereas)(?:\s|$)/i;

function normalise(raw: string): string {
  return raw.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
}

/**
 * Splits a contract into clause-sized chunks while preserving character offsets
 * into the *normalised* text, so the UI can highlight the exact source span.
 *
 * Strategy: break on blank lines, then merge fragments that do not look like a
 * new numbered clause into the preceding one. Oversized clauses are split on
 * sentence boundaries so a single call never exceeds the model's useful window.
 */
export function chunkIntoClauses(rawText: string): ClauseChunk[] {
  const text = normalise(rawText);
  const blocks = splitWithOffsets(text);
  const merged = mergeContinuations(blocks);

  const chunks: ClauseChunk[] = [];
  for (const block of merged) {
    if (block.text.trim().length < MIN_CLAUSE_CHARS) continue;
    for (const piece of enforceMaxLength(block)) {
      if (piece.text.trim().length === 0) continue;
      chunks.push({
        id: `c${chunks.length + 1}`,
        index: chunks.length + 1,
        text: piece.text.trim(),
        startOffset: piece.startOffset,
        endOffset: piece.endOffset,
      });
    }
  }
  return chunks;
}

interface Block {
  text: string;
  startOffset: number;
  endOffset: number;
}

function splitWithOffsets(text: string): Block[] {
  const blocks: Block[] = [];
  let cursor = 0;
  for (const part of text.split(/\n\s*\n/)) {
    const startOffset = text.indexOf(part, cursor);
    const endOffset = startOffset + part.length;
    cursor = endOffset;
    if (part.trim().length > 0) blocks.push({ text: part, startOffset, endOffset });
  }
  return blocks;
}

function mergeContinuations(blocks: Block[]): Block[] {
  const merged: Block[] = [];
  for (const block of blocks) {
    const previous = merged[merged.length - 1];
    const startsNewClause = CLAUSE_START.test(block.text);
    if (!startsNewClause && previous && previous.text.length + block.text.length < MAX_CLAUSE_CHARS) {
      previous.text = `${previous.text}\n${block.text}`;
      previous.endOffset = block.endOffset;
    } else {
      merged.push({ ...block });
    }
  }
  return merged;
}

function enforceMaxLength(block: Block): Block[] {
  if (block.text.length <= MAX_CLAUSE_CHARS) return [block];
  const pieces: Block[] = [];
  let buffer = "";
  let offset = block.startOffset;
  for (const sentence of block.text.split(/(?<=\.)\s+/)) {
    if (buffer.length + sentence.length > MAX_CLAUSE_CHARS && buffer.length > 0) {
      pieces.push({ text: buffer, startOffset: offset, endOffset: offset + buffer.length });
      offset += buffer.length;
      buffer = "";
    }
    buffer += buffer.length > 0 ? ` ${sentence}` : sentence;
  }
  if (buffer.length > 0) {
    pieces.push({ text: buffer, startOffset: offset, endOffset: offset + buffer.length });
  }
  return pieces;
}
