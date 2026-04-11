import { createClient } from "@/lib/supabase/server";
import { buildGraphData } from "@/lib/wiki/graph";
import { GraphView } from "@/components/wiki/GraphView";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const revalidate = 60;

export default async function GraphPage() {
  const supabase = await createClient();

  const [{ data: pages }, { data: links }] = await Promise.all([
    supabase.from("wiki_pages").select("slug, title, tags, summary"),
    supabase.from("wiki_links").select("from_slug, to_slug"),
  ]);

  const graphData = buildGraphData(pages ?? [], links ?? []);

  return (
    <div className="h-screen flex flex-col">
      <header className="px-6 py-4 border-b border-wiki-border flex items-center gap-4">
        <Link
          href="/wiki"
          className="flex items-center gap-1.5 text-wiki-muted hover:text-wiki-text text-sm transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Wiki
        </Link>
        <h1 className="text-lg font-semibold text-wiki-text">Graph View</h1>
        <span className="text-sm text-wiki-muted ml-auto">
          {graphData.nodes.length} pages · {graphData.links.length} connections
        </span>
      </header>

      <div className="flex-1 p-4">
        <GraphView
          data={graphData}
          width={typeof window !== "undefined" ? window.innerWidth - 280 : 800}
          height={typeof window !== "undefined" ? window.innerHeight - 100 : 600}
        />
      </div>
    </div>
  );
}
