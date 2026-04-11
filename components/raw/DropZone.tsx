"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface UploadState {
  id: number;
  status: "uploading" | "ingesting" | "done" | "error";
  filename: string;
  error?: string;
}

export function DropZone() {
  const [dragActive, setDragActive] = useState(false);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const nextId = useRef(0);

  const processFile = useCallback(async (file: File) => {
    const id = nextId.current++;
    setUploads((prev) => [...prev, { id, status: "uploading", filename: file.name }]);

    try {
      // 1. Upload file
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      const { sourceId, error: uploadError } = await uploadRes.json();

      if (uploadError) throw new Error(uploadError);

      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: "ingesting" } : u))
      );

      // 2. Trigger ingest
      const ingestRes = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      const { error: ingestError } = await ingestRes.json();

      if (ingestError) throw new Error(ingestError);

      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: "done" } : u))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed";
      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: "error", error: message } : u))
      );
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      Array.from(e.dataTransfer.files).forEach(processFile);
    },
    [processFile]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      Array.from(e.target.files ?? []).forEach(processFile);
    },
    [processFile]
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
        <p className="text-wiki-text font-medium mb-1">Drop sources here or click to browse</p>
        <p className="text-wiki-muted text-sm">Markdown, text, PDF, HTML — anything you want the wiki to learn from</p>
        <input
          id="file-input"
          type="file"
          className="hidden"
          multiple
          accept=".md,.txt,.pdf,.html"
          onChange={onInputChange}
        />
      </div>

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
                  <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
                </span>
              )}
              {u.status === "ingesting" && (
                <span className="flex items-center gap-1.5 text-xs text-wiki-accent">
                  <Loader2 className="w-3 h-3 animate-spin" /> Ingesting into wiki…
                </span>
              )}
              {u.status === "done" && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle className="w-3 h-3" /> Done
                </span>
              )}
              {u.status === "error" && (
                <span className="flex items-center gap-1.5 text-xs text-red-400" title={u.error}>
                  <AlertCircle className="w-3 h-3" /> Error
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
