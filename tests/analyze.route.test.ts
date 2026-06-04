import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Мокаем внешние клиенты — сеть в тестах не трогаем.
vi.mock("@/lib/supadata", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supadata")>("@/lib/supadata");
  return {
    ...actual,
    fetchTranscript: vi.fn(),
  };
});
vi.mock("@/lib/openrouter", async () => {
  const actual = await vi.importActual<typeof import("@/lib/openrouter")>("@/lib/openrouter");
  return {
    ...actual,
    chatCompletion: vi.fn(),
  };
});

import { POST } from "@/app/api/analyze/route";
import { fetchTranscript, SupadataError } from "@/lib/supadata";
import { chatCompletion } from "@/lib/openrouter";

// Строим минимальный NextRequest с нужным методом json().
function makeReq(body: unknown, broken = false): NextRequest {
  return {
    json: async () => {
      if (broken) throw new Error("bad json");
      return body;
    },
  } as unknown as NextRequest;
}

const VALID_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

describe("POST /api/analyze — валидация", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("400 на битый JSON", async () => {
    const res = await POST(makeReq(null, true));
    expect(res.status).toBe(400);
  });

  it("400, если не указан url", async () => {
    const res = await POST(makeReq({ mode: "summary" }));
    expect(res.status).toBe(400);
  });

  it("400 при неизвестном режиме", async () => {
    const res = await POST(makeReq({ url: VALID_URL, mode: "nonsense" }));
    expect(res.status).toBe(400);
  });

  it("400, если в режиме qa нет вопроса", async () => {
    const res = await POST(makeReq({ url: VALID_URL, mode: "qa", question: "  " }));
    expect(res.status).toBe(400);
  });

  it("400 при ссылке не на YouTube", async () => {
    const res = await POST(makeReq({ url: "https://vimeo.com/123", mode: "summary" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/analyze — основной поток", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("возвращает анализ при корректном запросе", async () => {
    vi.mocked(fetchTranscript).mockResolvedValue({
      plainText: "текст",
      timedText: "[0:00] текст",
      lang: "ru",
      availableLangs: ["ru"],
    });
    vi.mocked(chatCompletion).mockResolvedValue("готовый анализ");

    const res = await POST(makeReq({ url: VALID_URL, mode: "summary", lang: "ru" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({
      videoId: "dQw4w9WgXcQ",
      mode: "summary",
      lang: "ru",
      analysis: "готовый анализ",
      truncated: false,
    });
  });

  it("пробрасывает статус ошибки от Supadata", async () => {
    vi.mocked(fetchTranscript).mockRejectedValue(new SupadataError("нет субтитров", 404));
    const res = await POST(makeReq({ url: VALID_URL, mode: "summary" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("нет субтитров");
  });

  it("отдаёт 500 на неожиданной ошибке", async () => {
    vi.mocked(fetchTranscript).mockRejectedValue(new Error("boom"));
    const res = await POST(makeReq({ url: VALID_URL, mode: "summary" }));
    expect(res.status).toBe(500);
  });
});
