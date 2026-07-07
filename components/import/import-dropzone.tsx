"use client";

import { useRef, useState } from "react";
import { FolderOpen, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImportDropzone({
  onZip,
  onFolder,
  disabled,
}: {
  onZip: (file: File) => void;
  onFolder: (files: { path: string; file: File }[]) => void;
  disabled?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith(".zip")) onZip(file);
  }

  function handleFolderPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).map((file) => ({
      path:
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
        file.name,
      file,
    }));
    if (files.length > 0) onFolder(files);
    e.target.value = "";
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        dragOver ? "border-primary bg-primary/5" : "border-input bg-card",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm font-medium mb-1">
        Drop your Google Takeout ZIP here
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        Everything is parsed in your browser — raw health data never leaves
        this device. Only daily summaries are saved.
      </p>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => zipInputRef.current?.click()}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Upload className="h-3.5 w-3.5" />
          Choose ZIP
        </button>
        <button
          type="button"
          onClick={() => folderInputRef.current?.click()}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-4 text-sm font-medium hover:bg-muted"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Unzipped folder
        </button>
      </div>
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onZip(file);
          e.target.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error non-standard but universally supported attribute
        webkitdirectory=""
        multiple
        className="hidden"
        onChange={handleFolderPick}
      />
    </div>
  );
}
