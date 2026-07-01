export function sanitiseCell(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|").trim();
}

export function stripImages(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, "[image omitted]");
}
