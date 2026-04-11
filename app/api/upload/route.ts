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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${auth.userId}/${Date.now()}-${sanitized}`;

    const { error: uploadError } = await supabase.storage
      .from("raw-sources")
      .upload(storagePath, file);

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
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
    } else if (HTML_TYPES.has(mime) || name.endsWith(".html") || name.endsWith(".htm")) {
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
