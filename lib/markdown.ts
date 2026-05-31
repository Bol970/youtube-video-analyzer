// Минимальный безопасный конвертер Markdown -> HTML.
// Сначала экранируем HTML, потом включаем только разрешённую разметку.
// Этого достаточно для вывода ответа LLM (заголовки, списки, выделение).

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

export function renderMarkdown(md: string): string {
  const lines = escapeHtml(md).split(/\r?\n/);
  const html: string[] = [];

  let listType: "ul" | "ol" | null = null;
  let para: string[] = [];

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };
  const flushPara = () => {
    if (para.length) {
      html.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      flushPara();
      closeList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushPara();
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    const ol = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (ol) {
      flushPara();
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    const ul = trimmed.match(/^[-*•]\s+(.*)$/);
    if (ul) {
      flushPara();
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    closeList();
    para.push(trimmed);
  }

  flushPara();
  closeList();
  return html.join("\n");
}
