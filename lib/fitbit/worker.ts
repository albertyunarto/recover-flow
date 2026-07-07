/// <reference lib="webworker" />
// Import worker: streams the Takeout ZIP with fflate, routes each file to its
// folder parser, and posts progress + the merged result. Raw file contents
// never leave this worker — only daily aggregates are returned.

import { Unzip, UnzipInflate } from "fflate";
import { findParser, fitbitFolderOf, parsers, KNOWN_FOLDERS } from "./registry";
import { mergeDailyPartials } from "./merge";
import type {
  DailyMetricPartial,
  FileEntry,
  FitbitFolderParser,
  FolderReport,
  ImportedExerciseRow,
  ImportWorkerResult,
  ParseResult,
  WorkerInMessage,
  WorkerOutMessage,
} from "./types";

declare const self: DedicatedWorkerGlobalScope;

function post(msg: WorkerOutMessage) {
  self.postMessage(msg);
}

class ImportRun {
  /** Buffered files per batch parser; streaming parsers never buffer. */
  private buffers = new Map<FitbitFolderParser, FileEntry[]>();
  private fileCounts = new Map<FitbitFolderParser, number>();
  private folderProgress = new Map<string, number>();
  private foundFolders = new Set<string>();
  private skipFolders: Set<string>;
  private startedAt = Date.now();

  constructor(skipFolders: string[] = []) {
    this.skipFolders = new Set(skipFolders);
  }

  shouldSkip(folder: string): boolean {
    return this.skipFolders.has(folder);
  }

  /** Mark a folder as present without parsing (skipped/unmatched files). */
  markFound(path: string) {
    const folder = fitbitFolderOf(path);
    if (folder) this.foundFolders.add(folder);
  }

  addFile(path: string, content: string) {
    const folder = fitbitFolderOf(path);
    if (!folder) return;
    this.foundFolders.add(folder);
    if (this.shouldSkip(folder)) return;

    const name = path.split("/").pop() ?? path;
    const parser = findParser(folder, name);
    if (!parser) return;

    this.fileCounts.set(parser, (this.fileCounts.get(parser) ?? 0) + 1);
    const done = (this.folderProgress.get(folder) ?? 0) + 1;
    this.folderProgress.set(folder, done);

    const entry: FileEntry = { name, content };
    if (parser.parseFile) {
      // Streaming parser: feed immediately, keep memory flat.
      parser.parseFile(entry);
    } else {
      let buffer = this.buffers.get(parser);
      if (!buffer) {
        buffer = [];
        this.buffers.set(parser, buffer);
      }
      buffer.push(entry);
    }
    post({ type: "progress", folder, filesDone: done });
  }

  async finish(): Promise<ImportWorkerResult> {
    const partialBatches: DailyMetricPartial[][] = [];
    const exercises: ImportedExerciseRow[] = [];
    const folderReports: FolderReport[] = [];

    for (const parser of parsers) {
      const files = this.fileCounts.get(parser) ?? 0;
      if (files === 0) continue;

      let result: ParseResult;
      try {
        result = parser.finalize
          ? parser.finalize()
          : await parser.parse(this.buffers.get(parser) ?? []);
      } catch {
        // A parser must never take the import down; report it fully skipped.
        result = { partials: [], rowsParsed: 0, rowsSkipped: files };
      }
      this.buffers.delete(parser);

      partialBatches.push(result.partials);
      if (result.exercises) exercises.push(...result.exercises);
      folderReports.push({
        folder: parser.folder,
        metricLabel: parser.metricLabel,
        files,
        rowsParsed: result.rowsParsed,
        rowsSkipped: result.rowsSkipped,
        days: new Set(result.partials.map((p) => p.date)).size,
        exercises: result.exercises?.length,
      });
    }

    const partials = mergeDailyPartials(partialBatches);
    const parserFolders = new Set(parsers.map((p) => p.folder));
    const known = new Set<string>(KNOWN_FOLDERS);

    return {
      partials,
      exercises,
      folderReports,
      unknownFolders: [...this.foundFolders].filter((f) => !known.has(f)),
      missingFolders: KNOWN_FOLDERS.filter(
        (f) => parserFolders.has(f) && !this.foundFolders.has(f)
      ),
      totalDays: partials.length,
      durationMs: Date.now() - this.startedAt,
    };
  }
}

const decoder = new TextDecoder();

async function runZip(file: File, skipFolders?: string[]) {
  const run = new ImportRun(skipFolders);
  let streamError: string | null = null;
  // Chain per-file handling so decode order stays deterministic.
  let pending = Promise.resolve();

  const unzip = new Unzip((zipFile) => {
    const folder = fitbitFolderOf(zipFile.name);
    if (!folder || zipFile.name.endsWith("/")) return;
    if (run.shouldSkip(folder)) {
      // Record presence but never decompress — this is what makes the
      // Heart Rate folder cheap to skip.
      run.markFound(zipFile.name);
      return;
    }

    const chunks: Uint8Array[] = [];
    zipFile.ondata = (err, chunk, final) => {
      if (err) {
        streamError = err.message;
        return;
      }
      if (chunk) chunks.push(chunk);
      if (final) {
        const merged = concat(chunks);
        chunks.length = 0;
        const content = decoder.decode(merged);
        pending = pending.then(() => run.addFile(zipFile.name, content));
      }
    };
    zipFile.start();
  });
  unzip.register(UnzipInflate);

  const reader = file.stream().getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      unzip.push(new Uint8Array(0), true);
      break;
    }
    unzip.push(value, false);
    if (streamError) break;
  }

  await pending;
  if (streamError) {
    post({ type: "error", message: `ZIP read failed: ${streamError}` });
    return;
  }
  post({ type: "done", result: await run.finish() });
}

async function runFiles(
  files: { path: string; file: File }[],
  skipFolders?: string[]
) {
  const run = new ImportRun(skipFolders);
  for (const { path, file } of files) {
    const folder = fitbitFolderOf(path);
    if (!folder) continue;
    if (run.shouldSkip(folder)) {
      run.markFound(path);
      continue;
    }
    run.addFile(path, await file.text());
  }
  post({ type: "done", result: await run.finish() });
}

function concat(chunks: Uint8Array[]): Uint8Array {
  if (chunks.length === 1) return chunks[0];
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;
  try {
    if (msg.type === "start-zip") {
      await runZip(msg.file, msg.skipFolders);
    } else if (msg.type === "start-files") {
      await runFiles(msg.files, msg.skipFolders);
    }
  } catch (err) {
    post({
      type: "error",
      message: err instanceof Error ? err.message : "Import failed",
    });
  }
};
