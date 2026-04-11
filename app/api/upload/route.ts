import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validateApiRequest } from "@/lib/utils/api-auth";
import { extractPdfText } from "@/lib/parsers/pdf";
import { extractHtmlText } from "@/lib/parsers/html";

const TEXT_TYPES = new Set(["text/plain", "text/markdown"]);
const PDF_TYPE = "application/pdf";
const HTML_TYPES = new Set(["text/html", "application/xhtml+xml"]);

export async function POST(request: NextRequest) {
  const auth = await validateApiRequest(request, "upload");
  if (auth instanceof NextResponse) return auth;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const supabase = createServiceClient();

    // ── JSON body: memo or url ──────────────────────────────
    if (contentType.includes("application/json")) {
      const body = await request.json();

      if (body.type === "memo") {
        const title =
          body.title?.trim() ||
          `Memo ${new Date().toISOString().slice(0, 10)}`;
        const content = body.content?.trim();
        if (!content) {
          return NextResponse.json(
            { error: "Memo content is empty" },
            { status: 400 },
          );
        }

        const { data, error } = await supabase
          .from("raw_sources")
          .insert({
            filename: title,
            storage_path: `memo://${auth.userId}/${Date.now()}`,
            mime_type: "text/plain",
            content,
            user_id: auth.userId,
          })
          .select("id")
          .single();

        if (error)
          return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, sourceId: data.id });
      }

      if (body.type === "url") {
        const url = body.url?.trim();
        if (!url) {
          return NextResponse.json(
            { error: "No URL provided" },
            { status: 400 },
          );
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        let content: string | null = null;
        let pageTitle = url;
        try {
          const res = await fetch(url, {
            signal: controller.signal,
            headers: { "User-Agent": "MnemoBot/1.0" },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const html = await res.text();
          content = await extractHtmlText(html);

          // Try to extract <title>
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) pageTitle = titleMatch[1].trim();
        } catch (e) {
          clearTimeout(timeout);
          const msg =
            e instanceof Error && e.name === "AbortError"
              ? "Request timed out"
              : "Failed to fetch URL";
          return NextResponse.json({ error: msg }, { status: 400 });
        } finally {
          clearTimeout(timeout);
        }

        const { data, error } = await supabase
          .from("raw_sources")
          .insert({
            filename: pageTitle,
            storage_path: `url://${auth.userId}/${Date.now()}`,
            mime_type: "text/html",
            content,
            user_id: auth.userId,
          })
          .select("id")
          .single();

        if (error)
          return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, sourceId: data.id });
      }

      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // ── FormData: file upload (existing) ────────────────────
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${auth.userId}/${Date.now()}-${sanitized}`;

    const { error: uploadError } = await supabase.storage
      .from("raw-sources")
      .upload(storagePath, file);

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 },
      );
    }

    let content: string | null = null;
    const mime = file.type;
    const name = file.name.toLowerCase();

    if (TEXT_TYPES.has(mime) || name.endsWith(".md") || name.endsWith(".txt")) {
      content = await file.text();
    } else if (mime === PDF_TYPE || name.endsWith(".pdf")) {
      try {
        const buffer = await file.arrayBuffer();
        content = await extractPdfText(buffer);
      } catch (e) {
        console.warn("PDF extraction failed:", e);
      }
    } else if (
      HTML_TYPES.has(mime) ||
      name.endsWith(".html") ||
      name.endsWith(".htm")
    ) {
      try {
        const html = await file.text();
        content = await extractHtmlText(html);
      } catch (e) {
        console.warn("HTML extraction failed:", e);
      }
    }

    const { data, error: dbError } = await supabase
      .from("raw_sources")
      .insert({
        filename: file.name,
        storage_path: storagePath,
        mime_type: file.type || "application/octet-stream",
        content,
        user_id: auth.userId,
      })
      .select("id")
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, sourceId: data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
