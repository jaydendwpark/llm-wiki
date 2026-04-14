"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Search,
  Upload,
  CheckSquare,
  Calendar,
  Plus,
  FileText,
  FolderOpen,
  ImageIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  BookmarkPlus,
  X,
} from "lucide-react";
import { useLocale } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import { WikiRenderer } from "@/components/wiki/WikiRenderer";
import { getFilesFromEntry, ACCEPTED_EXT } from "@/lib/utils/file-helpers";

/* ── Types ─────────────────────────────────────────────── */

interface QueryResult {
  answer: string;
  citedPages: string[];
  shouldFile: boolean;
  filedPage: { slug: string; title: string } | null;
}

interface UploadItem {
  id: number;
  name: string;
  status: "uploading" | "queued" | "ingesting" | "done" | "error";
  pagesCreated?: number;
  error?: string;
}

interface TaskResult {
  id: string;
  title: string;
  due_date: string | null;
}

type OutputState =
  | { type: "query"; loading: boolean; result: QueryResult | null; error: string | null }
  | { type: "register"; uploads: UploadItem[] }
  | { type: "task"; loading: boolean; result: TaskResult | null; error: string | null };

/* ── Theme hero ────────────────────────────────────────── */

const THEME_HERO: Record<string, string> = {
  dog: "\uD83D\uDC36",
  cat: "\uD83D\uDC31",
};

/* ── Component ─────────────────────────────────────────── */

export function HomeInput() {
  const { t } = useLocale();
  const { theme } = useTheme();

  const [text, setText] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(
    new Date().toISOString().slice(0, 10),
  );
  const [taskMode, setTaskMode] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [output, setOutput] = useState<OutputState | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const nextUploadId = useRef(0);

  /* ── Ingest queue (sequential) ── */
  const ingestQueue = useRef<{ sourceId: string; id: number }[]>([]);
  const ingesting = useRef(false);

  const drainIngestQueue = useCallback(async () => {
    if (ingesting.current) return;
    ingesting.current = true;

    while (ingestQueue.current.length > 0) {
      const { sourceId, id } = ingestQueue.current.shift()!;
      setOutput((prev) => {
        if (prev?.type !== "register") return prev;
        return {
          ...prev,
          uploads: prev.uploads.map((u) =>
            u.id === id ? { ...u, status: "ingesting" } : u,
          ),
        };
      });

      try {
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        const pagesCreated = 1 + (data.result?.updatedPages?.length ?? 0);
        setOutput((prev) => {
          if (prev?.type !== "register") return prev;
          return {
            ...prev,
            uploads: prev.uploads.map((u) =>
              u.id === id ? { ...u, status: "done", pagesCreated } : u,
            ),
          };
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : "Failed";
        setOutput((prev) => {
          if (prev?.type !== "register") return prev;
          return {
            ...prev,
            uploads: prev.uploads.map((u) =>
              u.id === id ? { ...u, status: "error", error } : u,
            ),
          };
        });
      }
    }

    ingesting.current = false;
  }, []);

  /* ── Auto-resize textarea ── */
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, [text]);

  /* ── Close popovers on outside click ── */
  useEffect(() => {
    if (!attachOpen) return;
    const handler = () => setAttachOpen(false);
    setTimeout(() => document.addEventListener("click", handler), 0);
    return () => document.removeEventListener("click", handler);
  }, [attachOpen]);

  /* ── Upload a file ── */
  const uploadFile = useCallback(
    async (file: File) => {
      const id = nextUploadId.current++;
      const item: UploadItem = { id, name: file.name, status: "uploading" };

      setOutput((prev) => {
        if (prev?.type === "register") {
          return { ...prev, uploads: [...prev.uploads, item] };
        }
        return { type: "register", uploads: [item] };
      });

      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setOutput((prev) => {
          if (prev?.type !== "register") return prev;
          return {
            ...prev,
            uploads: prev.uploads.map((u) =>
              u.id === id ? { ...u, status: "queued" } : u,
            ),
          };
        });

        ingestQueue.current.push({ sourceId: data.sourceId, id });
        drainIngestQueue();
      } catch (err) {
        const error = err instanceof Error ? err.message : "Upload failed";
        setOutput((prev) => {
          if (prev?.type !== "register") return prev;
          return {
            ...prev,
            uploads: prev.uploads.map((u) =>
              u.id === id ? { ...u, status: "error", error } : u,
            ),
          };
        });
      }
    },
    [drainIngestQueue],
  );

  /* ── Query handler ── */
  const handleQuery = useCallback(async () => {
    const question = text.trim();
    if (!question) return;

    setOutput({ type: "query", loading: true, result: null, error: null });

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setOutput({ type: "query", loading: false, result: data.result, error: null });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Query failed";
      setOutput({ type: "query", loading: false, result: null, error });
    }
  }, [text]);

  /* ── Register handler (memo/URL/files) ── */
  const handleRegister = useCallback(async () => {
    // Task mode → create task
    if (taskMode) {
      const title = text.trim();
      if (!title) return;

      setOutput({ type: "task", loading: true, result: null, error: null });

      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            due_date: selectedDate ?? undefined,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setOutput({ type: "task", loading: false, result: data.task, error: null });
        setText("");
        setSelectedDate(null);
        setTaskMode(false);
      } catch (err) {
        const error = err instanceof Error ? err.message : "Task creation failed";
        setOutput({ type: "task", loading: false, result: null, error });
      }
      return;
    }

    // Upload attached files
    if (attachments.length > 0) {
      attachments.forEach(uploadFile);
      setAttachments([]);
    }

    // Text-based registration (memo or URL)
    const content = text.trim();
    if (content) {
      const isUrl = /^https?:\/\//i.test(content);
      const id = nextUploadId.current++;
      const item: UploadItem = {
        id,
        name: isUrl ? content : `Memo ${new Date().toISOString().slice(0, 10)}`,
        status: "uploading",
      };

      setOutput((prev) => {
        if (prev?.type === "register") {
          return { ...prev, uploads: [...prev.uploads, item] };
        }
        return { type: "register", uploads: [item] };
      });

      try {
        const body = isUrl
          ? { type: "url", url: content }
          : { type: "memo", title: `Memo ${new Date().toISOString().slice(0, 10)}`, content };

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setOutput((prev) => {
          if (prev?.type !== "register") return prev;
          return {
            ...prev,
            uploads: prev.uploads.map((u) =>
              u.id === id ? { ...u, status: "queued" } : u,
            ),
          };
        });

        ingestQueue.current.push({ sourceId: data.sourceId, id });
        drainIngestQueue();
      } catch (err) {
        const error = err instanceof Error ? err.message : "Upload failed";
        setOutput((prev) => {
          if (prev?.type !== "register") return prev;
          return {
            ...prev,
            uploads: prev.uploads.map((u) =>
              u.id === id ? { ...u, status: "error", error } : u,
            ),
          };
        });
      }

      setText("");
    }
  }, [text, taskMode, selectedDate, attachments, uploadFile, drainIngestQueue]);

  /* ── Drag & drop ── */
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragActive(false);
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const items = Array.from(e.dataTransfer.items);
      const entries = items
        .map((item) => item.webkitGetAsEntry?.())
        .filter(Boolean) as FileSystemEntry[];
      let files: File[];
      if (entries.length > 0) {
        files = (await Promise.all(entries.map(getFilesFromEntry))).flat();
      } else {
        files = Array.from(e.dataTransfer.files).filter((f) => ACCEPTED_EXT.test(f.name));
      }
      if (files.length > 0) {
        files.forEach(uploadFile);
      }
    },
    [uploadFile],
  );

  /* ── File input handlers ── */
  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      setAttachments((prev) => [...prev, ...files]);
      e.target.value = "";
    },
    [],
  );

  const onFolderInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter((f) => ACCEPTED_EXT.test(f.name));
      setAttachments((prev) => [...prev, ...files]);
      e.target.value = "";
    },
    [],
  );

  const onImageInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      setAttachments((prev) => [...prev, ...files]);
      e.target.value = "";
    },
    [],
  );

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const isLoading =
    (output?.type === "query" && output.loading) ||
    (output?.type === "task" && output.loading);

  /* ── Render ── */
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col h-[calc(100dvh-5.5rem)] md:h-screen">
      {/* ═══ Output area (top, scrollable) ═══ */}
      <div className="flex-1 min-h-0 overflow-y-auto mb-4">
        {!output ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-4xl mb-4">
              {THEME_HERO[theme] ?? "\uD83D\uDCDC"}
            </div>
            <h2 className="text-lg font-bold text-wiki-text mb-1">
              {t("home.welcome")}
            </h2>
            <p className="text-wiki-muted text-sm max-w-sm">
              {t("home.welcomeDesc")}
            </p>
          </div>
        ) : output.type === "query" ? (
          <div className="bg-wiki-surface border border-wiki-border rounded-xl p-5 space-y-4">
            {output.loading && (
              <div className="flex items-center gap-2 text-wiki-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{t("query.thinking")}</span>
              </div>
            )}
            {output.error && (
              <div className="bg-wiki-err-soft border border-wiki-err/20 rounded-lg px-4 py-3 text-wiki-err text-sm">
                {output.error}
              </div>
            )}
            {output.result && (
              <>
                <WikiRenderer content={output.result.answer} />
                {output.result.citedPages.length > 0 && (
                  <div className="pt-3 border-t border-wiki-border">
                    <p className="text-xs text-wiki-muted uppercase tracking-wider mb-2">
                      {t("query.sources")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {output.result.citedPages.map((slug) => (
                        <a
                          key={slug}
                          href={`/wiki/${slug}`}
                          className="text-xs bg-wiki-bg border border-wiki-border rounded-full px-2.5 py-0.5 text-wiki-link hover:text-wiki-link-hover transition-colors"
                        >
                          {slug}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {output.result.filedPage && (
                  <div className="flex items-center gap-2 text-wiki-ok text-sm pt-1">
                    <BookmarkPlus className="w-4 h-4" />
                    {t("query.filedAs")}{" "}
                    <a
                      href={`/wiki/${output.result.filedPage.slug}`}
                      className="underline hover:text-wiki-ok"
                    >
                      {output.result.filedPage.title}
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        ) : output.type === "register" ? (
          <div className="space-y-2">
            {output.uploads.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 bg-wiki-surface border border-wiki-border rounded-lg px-4 py-3"
              >
                <FileText className="w-4 h-4 text-wiki-muted shrink-0" />
                <span className="text-sm text-wiki-text flex-1 truncate">{u.name}</span>
                {u.status === "uploading" && (
                  <span className="flex items-center gap-1.5 text-xs text-wiki-muted">
                    <Loader2 className="w-3 h-3 animate-spin" /> {t("home.uploading")}
                  </span>
                )}
                {u.status === "queued" && (
                  <span className="text-xs text-wiki-muted">{t("import.queued")}</span>
                )}
                {u.status === "ingesting" && (
                  <span className="flex items-center gap-1.5 text-xs text-wiki-accent">
                    <Loader2 className="w-3 h-3 animate-spin" /> {t("home.ingesting")}
                  </span>
                )}
                {u.status === "done" && (
                  <span className="flex items-center gap-1.5 text-xs text-wiki-ok">
                    <CheckCircle className="w-3 h-3" />
                    {u.pagesCreated
                      ? t("home.pagesCreated", { count: u.pagesCreated })
                      : t("home.registered")}
                  </span>
                )}
                {u.status === "error" && (
                  <span className="flex items-center gap-1.5 text-xs text-wiki-err" title={u.error}>
                    <AlertCircle className="w-3 h-3" /> {u.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : output.type === "task" ? (
          <div className="bg-wiki-surface border border-wiki-border rounded-xl p-5">
            {output.loading && (
              <div className="flex items-center gap-2 text-wiki-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{t("query.thinking")}</span>
              </div>
            )}
            {output.error && (
              <div className="bg-wiki-err-soft border border-wiki-err/20 rounded-lg px-4 py-3 text-wiki-err text-sm">
                {output.error}
              </div>
            )}
            {output.result && (
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-wiki-ok" />
                <div>
                  <p className="text-sm font-medium text-wiki-text">{t("home.taskCreated")}</p>
                  <p className="text-sm text-wiki-muted">{output.result.title}</p>
                  {output.result.due_date && (
                    <p className="text-xs text-wiki-muted mt-0.5">
                      {t("tasks.dueDate")}: {output.result.due_date}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ═══ Bottom section (toolbar + input + actions) ═══ */}
      <div className="shrink-0 space-y-3">
        {/* ── Options toolbar ── */}
        <div className="flex items-center gap-2">
          {/* Date button */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                selectedDate
                  ? "border-wiki-accent bg-wiki-accent/10 text-wiki-accent"
                  : "border-wiki-border bg-wiki-surface text-wiki-muted hover:text-wiki-text hover:border-wiki-accent/40"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {selectedDate ?? t("home.dateOption")}
              {selectedDate && (
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedDate(null); setShowDatePicker(false); }}
                  className="ml-0.5 hover:text-wiki-text"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </button>
            {showDatePicker && (
              <div className="absolute top-full left-0 mt-1 z-20">
                <input
                  type="date"
                  value={selectedDate ?? ""}
                  onChange={(e) => {
                    setSelectedDate(e.target.value || null);
                    setShowDatePicker(false);
                  }}
                  className="bg-wiki-surface border border-wiki-border rounded-lg px-3 py-2 text-sm text-wiki-text shadow-xl"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Task toggle */}
          <button
            onClick={() => setTaskMode(!taskMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              taskMode
                ? "border-wiki-accent bg-wiki-accent/10 text-wiki-accent"
                : "border-wiki-border bg-wiki-surface text-wiki-muted hover:text-wiki-text hover:border-wiki-accent/40"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            {t("home.taskOption")}
          </button>

          {/* Attach button */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setAttachOpen(!attachOpen); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-wiki-border bg-wiki-surface text-wiki-muted hover:text-wiki-text hover:border-wiki-accent/40 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("home.attach")}
            </button>
            {attachOpen && (
              <div className="absolute bottom-full left-0 mb-1 bg-wiki-surface border border-wiki-border rounded-xl shadow-2xl min-w-[9rem] overflow-hidden z-20">
                <button
                  onClick={() => { setAttachOpen(false); fileInputRef.current?.click(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-wiki-text hover:bg-wiki-border/30 transition-colors"
                >
                  <FileText className="w-4 h-4 text-wiki-muted" /> {t("home.attachFile")}
                </button>
                <button
                  onClick={() => { setAttachOpen(false); folderInputRef.current?.click(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-wiki-text hover:bg-wiki-border/30 transition-colors"
                >
                  <FolderOpen className="w-4 h-4 text-wiki-muted" /> {t("home.attachFolder")}
                </button>
                <button
                  onClick={() => { setAttachOpen(false); imageInputRef.current?.click(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-wiki-text hover:bg-wiki-border/30 transition-colors"
                >
                  <ImageIcon className="w-4 h-4 text-wiki-muted" /> {t("home.attachImage")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Attachments list ── */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-wiki-surface border border-wiki-border rounded-lg px-2.5 py-1 text-xs text-wiki-text"
              >
                <FileText className="w-3 h-3 text-wiki-muted" />
                <span className="truncate max-w-[120px]">{f.name}</span>
                <button onClick={() => removeAttachment(i)} className="text-wiki-muted hover:text-wiki-err">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Input area (drag & drop) ── */}
        <div
          className={`relative rounded-xl border-2 transition-all ${
            dragActive
              ? "border-wiki-accent bg-wiki-accent/5"
              : "border-wiki-border bg-wiki-surface"
          }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {dragActive && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-wiki-surface/80 backdrop-blur-sm rounded-xl pointer-events-none">
              <div className="text-center">
                <Upload className="w-6 h-6 text-wiki-accent mx-auto mb-1" />
                <p className="text-sm text-wiki-text font-medium">{t("home.dropFiles")}</p>
                <p className="text-xs text-wiki-muted">{t("home.dropDesc")}</p>
              </div>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`${t("home.placeholder")}\n${t("home.placeholderDrop")}`}
            rows={3}
            className="w-full bg-transparent rounded-xl px-4 py-3 text-sm text-wiki-text placeholder-wiki-muted focus:outline-none resize-none"
          />
        </div>

        {/* ── Action buttons ── */}
        <div className="flex justify-center gap-4 pb-2">
          <button
            onClick={handleQuery}
            disabled={!text.trim() || isLoading}
            className="flex items-center gap-2 px-8 py-2.5 rounded-full bg-wiki-accent hover:bg-wiki-accent/80 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors shadow-md shadow-wiki-accent/20"
          >
            <Search className="w-4 h-4" />
            {t("home.queryBtn")}
          </button>
          <button
            onClick={handleRegister}
            disabled={(!text.trim() && attachments.length === 0) || isLoading}
            className="flex items-center gap-2 px-8 py-2.5 rounded-full bg-wiki-accent hover:bg-wiki-accent/80 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors shadow-md shadow-wiki-accent/20"
          >
            {taskMode ? <CheckSquare className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            {t("home.registerBtn")}
          </button>
        </div>
      </div>

      {/* ── Hidden file inputs ── */}
      <input ref={fileInputRef} type="file" className="hidden" multiple accept=".md,.txt,.pdf,.html" onChange={onFileInput} />
      <input ref={folderInputRef} type="file" className="hidden" onChange={onFolderInput} {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)} />
      <input ref={imageInputRef} type="file" className="hidden" multiple accept="image/*" onChange={onImageInput} />
    </div>
  );
}
