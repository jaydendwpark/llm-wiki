"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  FolderOpen,
  PenLine,
  Link as LinkIcon,
  Send,
} from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

type InputMode = "file" | "memo" | "url";

interface UploadState {
  id: number;
  status: "uploading" | "queued" | "ingesting" | "done" | "error";
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

const TABS = [
  { id: "file" as const, icon: Upload, labelKey: "import.tabFile" },
  { id: "memo" as const, icon: PenLine, labelKey: "import.tabMemo" },
  { id: "url" as const, icon: LinkIcon, labelKey: "import.tabUrl" },
];

export function BuildWikiInput() {
  const { t } = useLocale();
  const [mode, setMode] = useState<InputMode>("file");
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const nextId = useRef(0);

  // ── Memo state ──
  const [memoTitle, setMemoTitle] = useState("");
  const [memoContent, setMemoContent] = useState("");
  const [memoSending, setMemoSending] = useState(false);

  // ── URL state ──
  const [urlValue, setUrlValue] = useState("");
  const [urlSending, setUrlSending] = useState(false);

  // ── Sequential ingest queue ──
  const ingestQueue = useRef<{ sourceId: string; id: number }[]>([]);
  const ingesting = useRef(false);

  const drainIngestQueue = useCallback(async () => {
    if (ingesting.current) return;
    ingesting.current = true;

    while (ingestQueue.current.length > 0) {
      const { sourceId, id } = ingestQueue.current.shift()!;
      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: "ingesting" } : u)),
      );
      try {
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId }),
        });
        const { error } = await res.json();
        if (error) throw new Error(error);
        setUploads((prev) =>
          prev.map((u) => (u.id === id ? { ...u, status: "done" } : u)),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed";
        setUploads((prev) =>
          prev.map((u) => (u.id === id ? { ...u, status: "error", error: message } : u)),
        );
      }
    }

    ingesting.current = false;
  }, []);

  // ── Shared upload pipeline (upload parallel, ingest sequential) ──
  const processUpload = useCallback(
    async (name: string, uploadFn: () => Promise<string>) => {
      const id = nextId.current++;
      setUploads((prev) => [
        { id, status: "uploading", filename: name },
        ...prev,
      ]);

      try {
        const sourceId = await uploadFn();

        // Queue ingest instead of calling immediately
        setUploads((prev) =>
          prev.map((u) => (u.id === id ? { ...u, status: "queued" } : u)),
        );
        ingestQueue.current.push({ sourceId, id });
        drainIngestQueue();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed";
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, status: "error", error: message } : u,
          ),
        );
      }
    },
    [drainIngestQueue],
  );

  // ── File handlers ──
  const processFile = useCallback(
    (file: File) => {
      processUpload(file.name, async () => {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data.sourceId;
      });
    },
    [processUpload],
  );

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const items = Array.from(e.dataTransfer.items);
      const entries = items
        .map((item) => item.webkitGetAsEntry?.())
        .filter(Boolean) as FileSystemEntry[];
      if (entries.length > 0) {
        const files = (
          await Promise.all(entries.map(getFilesFromEntry))
        ).flat();
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
      Array.from(e.target.files ?? [])
        .filter((f) => ACCEPTED_EXT.test(f.name))
        .forEach(processFile);
      e.target.value = "";
    },
    [processFile],
  );

  // ── Memo handler ──
  const handleMemo = useCallback(() => {
    const content = memoContent.trim();
    if (!content) return;
    const title = memoTitle.trim() || `Memo ${new Date().toISOString().slice(0, 10)}`;

    setMemoSending(true);
    processUpload(title, async () => {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "memo", title, content }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.sourceId;
    }).finally(() => {
      setMemoSending(false);
      setMemoTitle("");
      setMemoContent("");
    });
  }, [memoTitle, memoContent, processUpload]);

  // ── URL handler ──
  const handleUrl = useCallback(() => {
    const url = urlValue.trim();
    if (!url) return;

    setUrlSending(true);
    processUpload(url, async () => {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "url", url }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.sourceId;
    }).finally(() => {
      setUrlSending(false);
      setUrlValue("");
    });
  }, [urlValue, processUpload]);

  const activeIndex = TABS.findIndex((tab) => tab.id === mode);

  return (
    <div className="space-y-4">
      {/* ── Tab selector with sliding indicator ── */}
      <div className="relative flex bg-wiki-bg border border-wiki-border rounded-xl p-1">
        <div
          className="absolute top-1 bottom-1 bg-wiki-surface rounded-lg shadow-sm transition-all duration-200 ease-out"
          style={{
            width: `${100 / TABS.length}%`,
            left: `${(activeIndex * 100) / TABS.length}%`,
          }}
        />
        {TABS.map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 ${
              mode === id
                ? "text-wiki-text"
                : "text-wiki-muted hover:text-wiki-text"
            }`}
          >
            <Icon className="w-4 h-4" />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* ── File mode ── */}
      {mode === "file" && (
        <div className="space-y-3">
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
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
            <Upload className="w-8 h-8 mx-auto mb-3 text-wiki-muted" />
            <p className="text-wiki-text font-medium mb-1">
              {t("import.dropHere")}
            </p>
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
        </div>
      )}

      {/* ── Memo mode ── */}
      {mode === "memo" && (
        <div className="space-y-3">
          <input
            type="text"
            value={memoTitle}
            onChange={(e) => setMemoTitle(e.target.value)}
            placeholder={t("import.memoTitle")}
            className="w-full bg-wiki-surface border border-wiki-border rounded-lg px-4 py-2.5 text-sm text-wiki-text placeholder-wiki-muted focus:outline-none focus:border-wiki-accent transition-colors"
          />
          <textarea
            value={memoContent}
            onChange={(e) => setMemoContent(e.target.value)}
            placeholder={t("import.memoPlaceholder")}
            rows={6}
            className="w-full bg-wiki-surface border border-wiki-border rounded-xl px-4 py-3 text-sm text-wiki-text placeholder-wiki-muted focus:outline-none focus:border-wiki-accent transition-colors resize-none"
          />
          <button
            onClick={handleMemo}
            disabled={!memoContent.trim() || memoSending}
            className="flex items-center gap-2 bg-wiki-accent hover:bg-wiki-accent/80 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {memoSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {t("import.memoSubmit")}
          </button>
        </div>
      )}

      {/* ── URL mode ── */}
      {mode === "url" && (
        <div className="flex gap-3">
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && urlValue.trim() && !urlSending)
                handleUrl();
            }}
            placeholder={t("import.urlPlaceholder")}
            className="flex-1 bg-wiki-surface border border-wiki-border rounded-lg px-4 py-3 text-sm text-wiki-text placeholder-wiki-muted focus:outline-none focus:border-wiki-accent transition-colors"
          />
          <button
            onClick={handleUrl}
            disabled={!urlValue.trim() || urlSending}
            className="flex items-center gap-2 bg-wiki-accent hover:bg-wiki-accent/80 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            {urlSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("import.urlFetching")}
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4" />
                {t("import.urlFetch")}
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Shared upload status ── */}
      {uploads.length > 0 && (
        <div className="space-y-2 pt-2">
          {uploads.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 bg-wiki-surface border border-wiki-border rounded-lg px-4 py-3"
            >
              <FileText className="w-4 h-4 text-wiki-muted shrink-0" />
              <span className="text-sm text-wiki-text flex-1 truncate">
                {u.filename}
              </span>
              {u.status === "uploading" && (
                <span className="flex items-center gap-1.5 text-xs text-wiki-muted">
                  <Loader2 className="w-3 h-3 animate-spin" />{" "}
                  {t("import.uploading")}
                </span>
              )}
              {u.status === "queued" && (
                <span className="flex items-center gap-1.5 text-xs text-wiki-muted">
                  {t("import.queued")}
                </span>
              )}
              {u.status === "ingesting" && (
                <span className="flex items-center gap-1.5 text-xs text-wiki-accent">
                  <Loader2 className="w-3 h-3 animate-spin" />{" "}
                  {t("import.ingesting")}
                </span>
              )}
              {u.status === "done" && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <CheckCircle className="w-3 h-3" /> {t("import.done")}
                </span>
              )}
              {u.status === "error" && (
                <span
                  className="flex items-center gap-1.5 text-xs text-red-600"
                  title={u.error}
                >
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
