/**
 * HTML to plain text extraction using cheerio.
 */
export async function extractHtmlText(html: string): Promise<string> {
  const { load } = await import("cheerio");
  const $ = load(html);

  // Remove script, style, nav, footer elements
  $("script, style, nav, footer, header, aside, noscript").remove();

  // Try to find main content area
  const mainContent =
    $("article").text() ||
    $("main").text() ||
    $('[role="main"]').text() ||
    $("body").text();

  // Clean up whitespace
  return mainContent
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
