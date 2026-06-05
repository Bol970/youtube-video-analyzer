import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchTranscript, SupadataError } from "@/lib/supadata";

// Хелпер: формируем Response-подобный объект для мока fetch.
function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("fetchTranscript", () => {
  beforeEach(() => {
    process.env.SUPADATA_API_KEY = "test-key";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("бросает SupadataError, если ключ не задан", async () => {
    delete process.env.SUPADATA_API_KEY;
    await expect(fetchTranscript("dQw4w9WgXcQ")).rejects.toBeInstanceOf(SupadataError);
  });

  it("склеивает сегменты в plainText и timedText", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        lang: "ru",
        availableLangs: ["ru", "en"],
        content: [
          { text: "Привет", offset: 0, duration: 1000, lang: "ru" },
          { text: "мир", offset: 65_000, duration: 1000, lang: "ru" },
        ],
      })
    );

    const res = await fetchTranscript("dQw4w9WgXcQ", "ru");
    expect(res.plainText).toBe("Привет мир");
    expect(res.timedText).toContain("[0:00] Привет");
    expect(res.timedText).toContain("[1:05] мир");
    expect(res.lang).toBe("ru");
    expect(res.availableLangs).toEqual(["ru", "en"]);
  });

  it("передаёт ключ в заголовке x-api-key и lang в query", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ content: [{ text: "hi", offset: 0, duration: 1, lang: "en" }] })
    );
    await fetchTranscript("dQw4w9WgXcQ", "en");
    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toContain("videoId=dQw4w9WgXcQ");
    expect(String(url)).toContain("lang=en");
    expect((init as RequestInit).headers).toMatchObject({ "x-api-key": "test-key" });
  });

  it("бросает понятную ошибку 401 без повторов", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, 401));
    await expect(fetchTranscript("dQw4w9WgXcQ")).rejects.toMatchObject({
      status: 401,
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("бросает 404, когда транскрипт не найден", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, 404));
    await expect(fetchTranscript("dQw4w9WgXcQ")).rejects.toMatchObject({ status: 404 });
  });

  it("сообщает об асинхронной обработке длинного видео (jobId)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ jobId: "abc" }));
    await expect(fetchTranscript("dQw4w9WgXcQ")).rejects.toMatchObject({ status: 202 });
  });

  it("даёт понятную ошибку на некорректный JSON от Supadata", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("bad json");
      },
      text: async () => "",
    } as unknown as Response);

    await expect(fetchTranscript("dQw4w9WgXcQ")).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining("некорректный ответ"),
    });
  });
});
