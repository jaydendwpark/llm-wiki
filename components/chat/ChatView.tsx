"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Plus,
  Send,
  Loader2,
  FileText,
  PenLine,
  Link as LinkIcon,
  FolderOpen,
  X,
  CheckCircle,
  AlertCircle,
  ScrollText,
} from "lucide-react";
import { useLocale } from "@/lib/i18n/context";
import { WikiRenderer } from "@/components/wiki/WikiRenderer";

/* ── Types ──────────────────────────────────────────────────────── */

interface ChatMessage {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  type: "query" | "upload";
  sources?: string[];
  filedPage?: { slug: string; title: string } | null;
  uploadStatus?: "uploading" | "queued" | "ingesting" | "done" | "error";
  uploadName?: string;
  pagesCreated?: number;
  error?: string;
}

/* ── Helpers ─────────────────────────────────────────────────────── */

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

/* ── Component ───────────────────────────────────────────────────── */

export function ChatView() {
  const { t } = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [memoMode, setMemoMode] = useState(false);
  const [memoTitle, setMemoTitle] = useState("");
  const nextId = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── Ingest queue ── */
  const ingestQueue = useRef<{ sourceId: string; msgId: number }[]>([]);
  const ingesting = useRef(false);

  const drainIngestQueue = useCallback(async () => {
    if (ingesting.current) return;
    ingesting.current = true;

    while (ingestQueue.current.length > 0) {
      const { sourceId, msgId } = ingestQueue.current.shift()!;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, uploadStatus: "ingesting" } : m,
        ),
      );
      try {
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        const pagesCreated =
          1 + (data.result?.updatedPages?.length ?? 0);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, uploadStatus: "done", pagesCreated }
              : m,
          ),
        );
      } catch (err) {
        const error = err instanceof Error ? err.message : "Failed";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, uploadStatus: "error", error } : m,
          ),
        );
      }
    }

    ingesting.current = false;
  }, []);

  /* ── Scroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* ── Auto-resize textarea ── */
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  }, [input, memoMode]);

  /* ── Close attach on outside click ── */
  useEffect(() => {
    if (!attachOpen) return;
    const handler = () => setAttachOpen(false);
    setTimeout(() => document.addEventListener("click", handler), 0);
    return () => document.removeEventListener("click", handler);
  }, [attachOpen]);

  /* ── Handlers ── */

  const addUploadMessage = useCallback(
    (name: string): number => {
      const id = nextId.current++;
      setMessages((prev) => [
        ...prev,
        {
          id,
          role: "system",
          content: name,
          type: "upload",
          uploadStatus: "uploading",
          uploadName: name,
        },
      ]);
      return id;
    },
    [],
  );

  const handleQuery = useCallback(
    async (question: string) => {
      const uid = nextId.current++;
      setMessages((prev) => [
        ...prev,
        { id: uid, role: "user", content: question, type: "query" },
      ]);
      setLoading(true);

      try {
        const res = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        const aid = nextId.current++;
        setMessages((prev) => [
          ...prev,
          {
            id: aid,
            role: "assistant",
            content: data.result.answer,
            type: "query",
            sources: data.result.citedPages,
            filedPage: data.result.filedPage,
          },
        ]);
      } catch (err) {
        const eid = nextId.current++;
        setMessages((prev) => [
          ...prev,
          {
            id: eid,
            role: "system",
            content: err instanceof Error ? err.message : "Query failed",
            type: "query",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const startUpload = useCallback(
    async (
      name: string,
      uploadFn: () => Promise<string>,
    ) => {
      const msgId = addUploadMessage(name);

      try {
        const sourceId = await uploadFn();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, uploadStatus: "queued" } : m,
          ),
        );
        ingestQueue.current.push({ sourceId, msgId });
        drainIngestQueue();
      } catch (err) {
        const error = err instanceof Error ? err.message : "Upload failed";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, uploadStatus: "error", error } : m,
          ),
        );
      }
    },
    [addUploadMessage, drainIngestQueue],
  );

  const handleFileUpload = useCallback(
    (file: File) => {
      startUpload(file.name, async () => {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data.sourceId;
      });
    },
    [startUpload],
  );

  const handleUrlIngest = useCallback(
    (url: string) => {
      startUpload(url, async () => {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "url", url }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data.sourceId;
      });
    },
    [startUpload],
  );

  const handleMemoIngest = useCallback(
    (title: string, content: string) => {
      const displayTitle = title || `Memo ${new Date().toISOString().slice(0, 10)}`;
      startUpload(displayTitle, async () => {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "memo", title: displayTitle, content }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data.sourceId;
      });
    },
    [startUpload],
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    if (memoMode) {
      handleMemoIngest(memoTitle.trim(), text);
      setMemoMode(false);
      setMemoTitle("");
      return;
    }

    if (/^https?:\/\//i.test(text)) {
      handleUrlIngest(text);
      return;
    }

    handleQuery(text);
  }, [input, loading, memoMode, memoTitle, handleQuery, handleUrlIngest, handleMemoIngest]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      Array.from(e.target.files ?? []).forEach(handleFileUpload);
      e.target.value = "";
    },
    [handleFileUpload],
  );

  const onFolderInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      Array.from(e.target.files ?? [])
        .filter((f) => ACCEPTED_EXT.test(f.name))
        .forEach(handleFileUpload);
      e.target.value = "";
    },
    [handleFileUpload],
  );

  /* ── Render ── */

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-screen">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ScrollText className="w-10 h-10 text-wiki-accent mb-4" />
              <h2 className="text-lg font-semibold text-wiki-text mb-2">
                {t("chat.welcome")}
              </h2>
              <p className="text-wiki-muted text-sm max-w-sm">
                {t("chat.welcomeDesc")}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id}>
              {/* User message */}
              {msg.role === "user" && (
                <div className="flex justify-end">
                  <div className="bg-wiki-accent/20 border border-wiki-accent/30 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]">
                    <p className="text-sm text-wiki-text whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </div>
              )}

              {/* Assistant message */}
              {msg.role === "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-wiki-surface border border-wiki-border rounded-2xl rounded-bl-md px-4 py-3 max-w-[90%] space-y-3">
                    <WikiRenderer
                      content={msg.content}
                      className="text-sm"
                    />

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="pt-2 border-t border-wiki-border">
                        <p className="text-xs text-wiki-muted mb-1.5">
                          {t("query.sources")}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((slug) => (
                            <a
                              key={slug}
                              href={`/wiki/${slug}`}
                              className="text-xs bg-wiki-bg border border-wiki-border rounded px-2 py-0.5 text-wiki-link hover:text-wiki-link-hover transition-colors"
                            >
                              {slug}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {msg.filedPage && (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs pt-1">
                        <CheckCircle className="w-3 h-3" />
                        {t("query.filedAs")}{" "}
                        <a
                          href={`/wiki/${msg.filedPage.slug}`}
                          className="underline hover:text-emerald-300"
                        >
                          {msg.filedPage.title}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* System/upload message */}
              {msg.role === "system" && msg.type === "upload" && (
                <div className="flex justify-start">
                  <div className="bg-wiki-surface/50 border border-wiki-border rounded-xl px-4 py-2.5 max-w-[85%] flex items-center gap-3">
                    <FileText className="w-4 h-4 text-wiki-muted shrink-0" />
                    <span className="text-sm text-wiki-text truncate flex-1">
                      {msg.uploadName}
                    </span>
                    {msg.uploadStatus === "uploading" && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-wiki-muted shrink-0" />
                    )}
                    {msg.uploadStatus === "queued" && (
                      <span className="text-xs text-wiki-muted shrink-0">
                        {t("import.queued")}
                      </span>
                    )}
                    {msg.uploadStatus === "ingesting" && (
                      <span className="flex items-center gap-1 text-xs text-wiki-accent shrink-0">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {t("import.ingesting")}
                      </span>
                    )}
                    {msg.uploadStatus === "done" && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
                        <CheckCircle className="w-3 h-3" />
                        {msg.pagesCreated
                          ? t("chat.pagesCreated", {
                              count: msg.pagesCreated,
                            })
                          : t("import.done")}
                      </span>
                    )}
                    {msg.uploadStatus === "error" && (
                      <span
                        className="flex items-center gap-1 text-xs text-red-400 shrink-0"
                        title={msg.error}
                      >
                        <AlertCircle className="w-3 h-3" />
                        {t("import.error")}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* System error (query) */}
              {msg.role === "system" && msg.type === "query" && (
                <div className="flex justify-start">
                  <div className="bg-red-950/20 border border-red-800/50 rounded-xl px-4 py-2.5 text-sm text-red-400">
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-wiki-surface border border-wiki-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-wiki-accent" />
                <span className="text-sm text-wiki-muted">
                  {t("query.thinking")}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-wiki-border bg-wiki-surface">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {/* Memo mode header */}
          {memoMode && (
            <div className="flex items-center gap-2 mb-2">
              <PenLine className="w-4 h-4 text-wiki-accent shrink-0" />
              <input
                type="text"
                value={memoTitle}
                onChange={(e) => setMemoTitle(e.target.value)}
                placeholder={t("import.memoTitle")}
                className="flex-1 bg-transparent text-sm text-wiki-text placeholder-wiki-muted focus:outline-none"
              />
              <button
                onClick={() => {
                  setMemoMode(false);
                  setMemoTitle("");
                }}
                className="text-wiki-muted hover:text-wiki-text transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Attach button */}
            <div className="relative shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAttachOpen(!attachOpen);
                }}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-wiki-muted hover:text-wiki-text hover:bg-wiki-border/50 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>

              {attachOpen && (
                <div className="absolute bottom-full left-0 mb-2 bg-wiki-surface border border-wiki-border rounded-xl shadow-xl overflow-hidden min-w-[10rem] z-10">
                  <button
                    onClick={() => {
                      setAttachOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-wiki-text hover:bg-wiki-border/50 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-wiki-muted" />
                    {t("chat.uploadFile")}
                  </button>
                  <button
                    onClick={() => {
                      setAttachOpen(false);
                      folderInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-wiki-text hover:bg-wiki-border/50 transition-colors"
                  >
                    <FolderOpen className="w-4 h-4 text-wiki-muted" />
                    {t("chat.uploadFolder")}
                  </button>
                  <button
                    onClick={() => {
                      setAttachOpen(false);
                      setMemoMode(true);
                      setTimeout(() => textareaRef.current?.focus(), 50);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-wiki-text hover:bg-wiki-border/50 transition-colors"
                  >
                    <PenLine className="w-4 h-4 text-wiki-muted" />
                    {t("chat.writeMemo")}
                  </button>
                </div>
              )}
            </div>

            {/* Text input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                memoMode
                  ? t("import.memoPlaceholder")
                  : t("chat.placeholder")
              }
              rows={1}
              className="flex-1 bg-wiki-bg border border-wiki-border rounded-xl px-4 py-2.5 text-sm text-wiki-text placeholder-wiki-muted focus:outline-none focus:border-wiki-accent transition-colors resize-none max-h-40"
            />

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-wiki-accent hover:bg-wiki-accent/80 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".md,.txt,.pdf,.html"
          onChange={onFileInput}
        />
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          onChange={onFolderInput}
          {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      </div>
    </div>
  );
}
