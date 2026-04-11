import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${Date.now()}-${sanitized}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("raw-sources")
      .upload(storagePath, file);

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // For text files, also store content directly for quick access
    let content: string | null = null;
    if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
      content = await file.text();
    }

    const { data, error: dbError } = await supabase
      .from("raw_sources")
      .insert({
        filename: file.name,
        storage_path: storagePath,
        mime_type: file.type,
        content,
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
