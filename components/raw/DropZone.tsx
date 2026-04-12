"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, FolderOpen } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

interface UploadState {
  id: number;
  status: "uploading" | "ingesting" | "done" | "error";
  filename: string;
  error?: string;
}

const ACCEPTED_EXT = /\.(md|txt|pdf|html)$/i;

async function getFilesFromEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    );
    return ACCEPTED_EXT.test(file.name) ? [file] : [];
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const all: FileSystemEntry[] = [];
    let batch: FileSystemEntry[];
    do {
      batch = await new Promise<FileSystemEntry[]>((resolve) =>
        reader.readEntries(resolve),
      );
      all.push(...batch);
    } while (batch.length > 0);
    return (await Promise.all(all.map(getFilesFromEntry))).flat();
  }
  return [];
}

export function DropZone() {
  const { t } = useLocale();
  const [dragActive, setDragActive] = useState(false);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const nextId = useRef(0);

  const processFile = useCallback(async (file: File) => {
    const id = nextId.current++;
    setUploads((prev) => [...prev, { id, status: "uploading", filename: file.name }]);

    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      const { sourceId, error: uploadError } = await uploadRes.json();

      if (uploadError) throw new Error(uploadError);

      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: "ingesting" } : u)),
      );

      const ingestRes = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      const { error: ingestError } = await ingestRes.json();

      if (ingestError) throw new Error(ingestError);

      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: "done" } : u)),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed";
      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: "error", error: message } : u)),
      );
    }
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);

      const items = Array.from(e.dataTransfer.items);
      const entries = items
        .map((item) => item.webkitGetAsEntry?.())
        .filter(Boolean) as FileSystemEntry[];

      if (entries.length > 0) {
        const files = (await Promise.all(entries.map(getFilesFromEntry))).flat();
        files.forEach(processFile);
      } else {
        Array.from(e.dataTransfer.files).forEach(processFile);
      }
    },
    [processFile],
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      Array.from(e.target.files ?? []).forEach(processFile);
      e.target.value = "";
    },
    [processFile],
  );

  const onFolderInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter((f) =>
        ACCEPTED_EXT.test(f.name),
      );
      files.forEach(processFile);
      e.target.value = "";
    },
    [processFile],
  );

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
          dragActive
            ? "border-wiki-accent bg-wiki-accent/10"
            : "border-wiki-border hover:border-wiki-accent/50 hover:bg-wiki-surface"
        }`}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <Upload className="w-10 h-10 mx-auto mb-4 text-wiki-muted" />
        <p className="text-wiki-text font-medium mb-1">{t("import.dropHere")}</p>
        <p className="text-wiki-muted text-sm">{t("import.dropDesc")}</p>
        <input
          id="file-input"
          type="file"
          className="hidden"
          multiple
          accept=".md,.txt,.pdf,.html"
          onChange={onFileInput}
        />
        <input
          id="folder-input"
          type="file"
          className="hidden"
          onChange={onFolderInput}
          {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          document.getElementById("folder-input")?.click();
        }}
        className="flex items-center gap-2 text-wiki-muted hover:text-wiki-text text-sm transition-colors"
      >
        <FolderOpen className="w-4 h-4" />
        {t("import.uploadFolder")}
      </button>

      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 bg-wiki-surface border border-wiki-border rounded-lg px-4 py-3"
            >
              <FileText className="w-4 h-4 text-wiki-muted shrink-0" />
              <span className="text-sm text-wiki-text flex-1 truncate">{u.filename}</span>
              {u.status === "uploading" && (
                <span className="flex items-center gap-1.5 text-xs text-wiki-muted">
                  <Loader2 className="w-3 h-3 animate-spin" /> {t("import.uploading")}
                </span>
              )}
              {u.status === "ingesting" && (
                <span className="flex items-center gap-1.5 text-xs text-wiki-accent">
                  <Loader2 className="w-3 h-3 animate-spin" /> {t("import.ingesting")}
                </span>
              )}
              {u.status === "done" && (
                <span className="flex items-center gap-1.5 text-xs text-wiki-ok">
                  <CheckCircle className="w-3 h-3" /> {t("import.done")}
                </span>
              )}
              {u.status === "error" && (
                <span className="flex items-center gap-1.5 text-xs text-wiki-err" title={u.error}>
                  <AlertCircle className="w-3 h-3" /> {t("import.error")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
