// Minimal CSV parsing for Fitbit export files. Handles quoted fields and
// CRLF; headers are matched case-insensitively since Google has shipped both
// UPPER_SNAKE and lower_snake variants across export revisions.

export interface CsvTable {
  headers: string[];
  rows: string[][];
}

export function parseCsv(content: string): CsvTable {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map(splitCsvLine);
  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out.map((f) => f.trim());
}

/** Case-insensitive header lookup; returns -1 when no candidate matches. */
export function columnIndex(headers: string[], ...candidates: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());
  for (const candidate of candidates) {
    const idx = lower.indexOf(candidate.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}
