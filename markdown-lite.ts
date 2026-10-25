/** Minimal, safe markdown renderer for admin-editable policy pages. */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-burgundy underline">$1</a>');
  return out;
}

export function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const t = line.trim();
    if (t.startsWith("### ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h3 class="mt-5 font-serif text-lg text-charcoal">${inline(t.slice(4))}</h3>`);
    } else if (t.startsWith("## ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h2 class="mt-6 font-serif text-2xl text-charcoal">${inline(t.slice(3))}</h2>`);
    } else if (t.startsWith("# ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h1 class="mt-6 font-serif text-3xl text-charcoal">${inline(t.slice(2))}</h1>`);
    } else if (t.startsWith("- ") || t.startsWith("* ")) {
      if (!inList) { html.push('<ul class="my-3 list-disc space-y-1 pl-6 text-charcoal-soft">'); inList = true; }
      html.push(`<li>${inline(t.slice(2))}</li>`);
    } else if (!t) {
      if (inList) { html.push("</ul>"); inList = false; }
    } else {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<p class="my-3 leading-relaxed text-charcoal-soft">${inline(t)}</p>`);
    }
  }
  if (inList) html.push("</ul>");
  return html.join("\n");
}
