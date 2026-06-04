import { describe, it, expect } from "vitest";
import { buildMessages, isAnalysisMode, MODES } from "@/lib/prompts";

describe("isAnalysisMode", () => {
  it("принимает все известные режимы", () => {
    for (const m of MODES) {
      expect(isAnalysisMode(m.id)).toBe(true);
    }
  });

  it("отвергает неизвестные значения", () => {
    expect(isAnalysisMode("unknown")).toBe(false);
    expect(isAnalysisMode("")).toBe(false);
    expect(isAnalysisMode(undefined)).toBe(false);
    expect(isAnalysisMode(null)).toBe(false);
    expect(isAnalysisMode(123)).toBe(false);
  });
});

describe("buildMessages", () => {
  const PLAIN = "обычный текст транскрипта";
  const TIMED = "[0:00] обычный текст транскрипта";

  it("всегда возвращает system + user сообщения", () => {
    const msgs = buildMessages("summary", PLAIN, TIMED);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].role).toBe("user");
  });

  it("режим summary использует простой текст", () => {
    const [, user] = buildMessages("summary", PLAIN, TIMED);
    expect(user.content).toContain(PLAIN);
    expect(user.content).toContain("пересказ");
  });

  it("режим chapters использует текст с таймкодами", () => {
    const [, user] = buildMessages("chapters", PLAIN, TIMED);
    expect(user.content).toContain(TIMED);
    expect(user.content).toContain("таймкод");
  });

  it("режим qa включает вопрос пользователя", () => {
    const [, user] = buildMessages("qa", PLAIN, TIMED, "Сколько советов даёт автор?");
    expect(user.content).toContain("Сколько советов даёт автор?");
    expect(user.content).toContain(PLAIN);
  });
});
