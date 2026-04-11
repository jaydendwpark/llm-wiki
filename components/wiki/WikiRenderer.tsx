"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { renderWikiLinks } from "@/lib/wiki/parser";
import { unified } from "unified";
import remarkParse from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

interface WikiRendererProps {
  content: string;
  className?: string;
}

export function WikiRenderer({ content, className = "" }: WikiRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Convert [[wiki-links]] then render markdown
  const withLinks = renderWikiLinks(content, "/wiki");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Intercept wiki-link clicks for client-side navigation
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a.wiki-link") as HTMLAnchorElement | null;
      if (anchor) {
        e.preventDefault();
        router.push(anchor.href.replace(window.location.origin, ""));
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [router]);

  return (
    <div
      ref={containerRef}
      className={`prose prose-invert max-w-none prose-a:text-wiki-link hover:prose-a:text-wiki-link-hover ${className}`}
      dangerouslySetInnerHTML={{ __html: withLinks }}
    />
  );
}
