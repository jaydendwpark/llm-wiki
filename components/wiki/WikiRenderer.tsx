"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { renderMarkdown } from "@/lib/wiki/markdown";

interface WikiRendererProps {
  content: string;
  className?: string;
}

export function WikiRenderer({ content, className = "" }: WikiRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [html, setHtml] = useState("");

  useEffect(() => {
    renderMarkdown(content).then(setHtml);
  }, [content]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a.wiki-link") as HTMLAnchorElement | null;
      if (anchor) {
        e.preventDefault();
        const path = new URL(anchor.href).pathname;
        router.push(path);
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [router]);

  return (
    <div
      ref={containerRef}
      className={`prose max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
