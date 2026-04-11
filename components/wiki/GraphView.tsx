"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { GraphData, GraphNode } from "@/lib/wiki/graph";

// Dynamically import to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-wiki-muted">
      Loading graph…
    </div>
  ),
});

const TAG_COLORS: Record<string, string> = {
  concept: "#7c3aed",
  entity: "#0ea5e9",
  source: "#10b981",
  "query-result": "#f59e0b",
  general: "#64748b",
};

function nodeColor(node: GraphNode): string {
  return TAG_COLORS[node.group] ?? TAG_COLORS.general;
}

interface GraphViewProps {
  data: GraphData;
  width?: number;
  height?: number;
}

export function GraphView({ data, width = 800, height = 600 }: GraphViewProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const graphRef = useRef<unknown>(null);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      router.push(`/wiki/${node.id}`);
    },
    [router]
  );

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHovered(node);
  }, []);

  return (
    <div className="relative bg-wiki-surface rounded-xl border border-wiki-border overflow-hidden">
      {/* Tooltip */}
      {hovered && (
        <div className="absolute top-4 left-4 z-10 bg-wiki-bg border border-wiki-border rounded-lg p-3 max-w-xs shadow-xl pointer-events-none">
          <p className="text-sm font-semibold text-wiki-text">{hovered.name}</p>
          {hovered.summary && (
            <p className="text-xs text-wiki-muted mt-1">{hovered.summary}</p>
          )}
          <p className="text-xs text-wiki-accent mt-1 capitalize">{hovered.group}</p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 bg-wiki-bg/80 border border-wiki-border rounded-lg p-3">
        <p className="text-xs text-wiki-muted mb-2 font-semibold uppercase tracking-wider">Legend</p>
        {Object.entries(TAG_COLORS).map(([tag, color]) => (
          <div key={tag} className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
            <span className="text-xs text-wiki-muted capitalize">{tag}</span>
          </div>
        ))}
      </div>

      <ForceGraph2D
        ref={graphRef as React.MutableRefObject<unknown>}
        graphData={data}
        width={width}
        height={height}
        backgroundColor="#0f1117"
        nodeLabel=""
        nodeColor={nodeColor}
        nodeVal={(node) => (node as GraphNode).val}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const n = node as GraphNode & { x: number; y: number };
          const r = Math.sqrt(n.val) * 2 + 2;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = nodeColor(n);
          ctx.fill();
          if (globalScale >= 1.5) {
            ctx.font = `${12 / globalScale}px Inter, sans-serif`;
            ctx.fillStyle = "#e2e8f0";
            ctx.textAlign = "center";
            ctx.fillText(n.name, n.x, n.y + r + 8 / globalScale);
          }
        }}
        linkColor={() => "#2a2d3e"}
        linkWidth={1}
        onNodeClick={handleNodeClick as (node: object) => void}
        onNodeHover={handleNodeHover as (node: object | null) => void}
        enableNodeDrag
        enableZoomInteraction
        cooldownTicks={100}
      />
    </div>
  );
}
