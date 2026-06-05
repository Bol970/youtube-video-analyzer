import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { chatCompletion, OpenRouterError } from "@/lib/openrouter";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const MESSAGES = [
  { role: "system" as const, content: "system" },
  { role: "user" as const, content: "user" },
];

describe("chatCompletion", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("бросает OpenRouterError без ключа", async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(chatCompletion(MESSAGES)).rejects.toBeInstanceOf(OpenRouterError);
  });

  it("возвращает текст ответа модели", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: "  готовый анализ  " } }] })
    );
    const result = await chatCompletion(MESSAGES);
    expect(result).toBe("готовый анализ");
  });

  it("отправляет Bearer-токен и модель из окружения", async () => {
    process.env.OPENROUTER_MODEL = "test/model-x";
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: "ok" } }] })
    );
    await chatCompletion(MESSAGES);
    const init = spy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    expect(JSON.parse(init.body as string).model).toBe("test/model-x");
    delete process.env.OPENROUTER_MODEL;
  });

  it("бросает 401 при неверном ключе", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, 401));
    await expect(chatCompletion(MESSAGES)).rejects.toMatchObject({ status: 401 });
  });

  it("бросает ошибку при пустом ответе модели", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: "" } }] })
    );
    await expect(chatCompletion(MESSAGES)).rejects.toBeInstanceOf(OpenRouterError);
  });

  it("даёт понятную ошибку на некорректный JSON от OpenRouter", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("bad json");
      },
      text: async () => "",
    } as unknown as Response);

    await expect(chatCompletion(MESSAGES)).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining("некорректный ответ"),
    });
  });
});
