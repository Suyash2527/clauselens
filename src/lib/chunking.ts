import type { ClauseChunk } from "./types";

const MIN_CLAUSE_CHARS = 40;
const MAX_CLAUSE_CHARS = 4_000;

/**
 * Matches the numbering styles used by the agreements this tool targets:
 * "1.", "1.2", "(a)", "Section 4", "ARTICLE III", "WHEREAS".
 */
const CLAUSE_START = /^\s*(?:\(?[a-z0-9]{1,4}[.)]|section\s+\d+[.)]?|article\s+[ivx\d]+[.)]?|whereas)(?:\s|$)/i;

/**
 * Top-level clause numbers only: "3.", "Section 3", "Article IV". Deliberately
 * excludes "3.1" and "(a)" so sub-clauses on their own lines stay with their parent.
 */
const TOP_LEVEL_LINE = /^\s*(?:(\d{1,3})\.(?!\d)|section\s+(\d{1,3})\b[.:)]?|article\s+(\d{1,3}|[ivxlc]{1,7})\b[.:)]?)\s/i;

/** Unifies line endings and runs of spaces so offsets are stable across platforms. */
function normaliseWhitespace(raw: string): string {
  return raw.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
}

/**
 * Splits a contract into clause-sized chunks while preserving character offsets
 * into the *normalised* text, so the UI can highlight the exact source span.
 *
 * Strategy: break on blank lines, then on lines that continue the top-level
 * numbering (for documents with no blank lines between clauses), then merge
 * fragments that do not look like a new numbered clause into the preceding one.
 * Oversized clauses are split on sentence boundaries so a single call never
 * exceeds the model's useful window.
 */
export function chunkIntoClauses(rawText: string): ClauseChunk[] {
  const text = normaliseWhitespace(rawText);
  const blocks = splitOnBlankLines(text).flatMap(splitOnNumberedLines);
  const merged = mergeContinuations(blocks);

  const chunks: ClauseChunk[] = [];
  for (const block of merged) {
    if (block.text.trim().length < MIN_CLAUSE_CHARS) continue;
    for (const piece of splitOversizedBlock(block)) {
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

function splitOnBlankLines(text: string): Block[] {
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

/**
 * Splits a block at lines that start the next top-level clause. A line only
 * counts if its number follows the last one seen (2 after 1, 3 after 2), so a
 * wrapped sentence that happens to begin "30. " does not start a new clause.
 */
function splitOnNumberedLines(block: Block): Block[] {
  const lines = block.text.split("\n");
  const starts: number[] = [];
  let lastNumber: number | null = null;
  let lineOffset = 0;
  lines.forEach((line, i) => {
    const number = topLevelNumber(line);
    if (number !== null) {
      if (i === 0) lastNumber = number;
      else if (lastNumber === null || number === lastNumber + 1) {
        starts.push(lineOffset);
        lastNumber = number;
      }
    }
    lineOffset += line.length + 1;
  });
  if (starts.length === 0) return [block];

  const bounds = [0, ...starts, block.text.length];
  const pieces: Block[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const text = block.text.slice(bounds[i], bounds[i + 1]).replace(/\n$/, "");
    const startOffset = block.startOffset + bounds[i]!;
    if (text.trim().length > 0) pieces.push({ text, startOffset, endOffset: startOffset + text.length });
  }
  return pieces;
}

function topLevelNumber(line: string): number | null {
  const match = TOP_LEVEL_LINE.exec(line);
  if (!match) return null;
  const token = match[1] ?? match[2] ?? match[3]!;
  return /^\d+$/.test(token) ? Number(token) : romanToNumber(token);
}

function romanToNumber(roman: string): number {
  const values: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100 };
  const digits = [...roman.toLowerCase()].map((ch) => values[ch] ?? 0);
  return digits.reduce((sum, value, i) => sum + (value < (digits[i + 1] ?? 0) ? -value : value), 0);
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

function splitOversizedBlock(block: Block): Block[] {
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
