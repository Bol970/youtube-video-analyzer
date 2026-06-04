import { describe, it, expect } from "vitest";
import { renderMarkdown } from "@/lib/markdown";

describe("renderMarkdown", () => {
  it("оформляет заголовки уровней 1-3", () => {
    expect(renderMarkdown("# Заголовок")).toBe("<h1>Заголовок</h1>");
    expect(renderMarkdown("## Заголовок")).toBe("<h2>Заголовок</h2>");
    expect(renderMarkdown("### Заголовок")).toBe("<h3>Заголовок</h3>");
  });

  it("собирает маркированный список", () => {
    const html = renderMarkdown("- раз\n- два");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>раз</li>");
    expect(html).toContain("<li>два</li>");
    expect(html).toContain("</ul>");
  });

  it("собирает нумерованный список", () => {
    const html = renderMarkdown("1. раз\n2. два");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>раз</li>");
    expect(html).toContain("</ol>");
  });

  it("поддерживает жирный, курсив и код", () => {
    expect(renderMarkdown("**жирный**")).toContain("<strong>жирный</strong>");
    expect(renderMarkdown("*курсив*")).toContain("<em>курсив</em>");
    expect(renderMarkdown("`код`")).toContain("<code>код</code>");
  });

  it("оборачивает обычный текст в параграф", () => {
    expect(renderMarkdown("просто строка")).toBe("<p>просто строка</p>");
  });

  // Ключевой тест безопасности: вывод LLM не должен пробрасывать сырой HTML/скрипты.
  it("экранирует HTML, защищая от XSS", () => {
    const html = renderMarkdown('<script>alert("xss")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("экранирует HTML внутри разметки Markdown", () => {
    const html = renderMarkdown("**<img src=x onerror=alert(1)>**");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
