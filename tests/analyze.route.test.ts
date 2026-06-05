import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Мокаем внешние клиенты — сеть в тестах не трогаем.
vi.mock("@/lib/supadata", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supadata")>("@/lib/supadata");
  return { ...actual, fetchTranscript: vi.fn() };
});
vi.mock("@/lib/openrouter", async () => {
  const actual = await vi.importActual<typeof import("@/lib/openrouter")>("@/lib/openrouter");
  return { ...actual, chatCompletion: vi.fn() };
});

// Мутабельное состояние мок-Supabase (через vi.hoisted, т.к. vi.mock поднимается вверх).
const sb = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  userErr: null as unknown,
  profileErr: null as unknown,
  plan: "free",
  count: 0,
  countErr: null as unknown,
  countEq: null as { column: string; value: string } | null,
  insertErr: null as unknown,
  inserted: [] as unknown[],
}));

vi.mock("@/lib/supabaseServer", () => ({
  getServerClientForToken: () => ({
    auth: { getUser: async () => ({ data: { user: sb.user }, error: sb.userErr }) },
    from: (table: string) =>
      table === "profiles"
        ? {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { plan: sb.plan }, error: sb.profileErr }),
              }),
            }),
          }
        : {
            select: () => ({
              eq: (column: string, value: string) => {
                sb.countEq = { column, value };
                return { gte: async () => ({ count: sb.count, error: sb.countErr }) };
              },
            }),
            insert: async (row: unknown) => {
              if (sb.insertErr) return { error: sb.insertErr };
              sb.inserted.push(row);
              return { error: null };
            },
          },
  }),
}));

import { POST } from "@/app/api/analyze/route";
import { fetchTranscript, SupadataError } from "@/lib/supadata";
import { chatCompletion } from "@/lib/openrouter";

function makeReq(
  body: unknown,
  opts: { broken?: boolean; auth?: string | null } = {}
): NextRequest {
  const { broken = false, auth = "valid-token" } = opts;
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "authorization" && auth ? `Bearer ${auth}` : null) },
    json: async () => {
      if (broken) throw new Error("bad json");
      return body;
    },
  } as unknown as NextRequest;
}

const VALID_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: false,
    status: 404,
    json: async () => ({}),
    text: async () => "",
  } as unknown as Response);
  sb.user = { id: "u1" };
  sb.userErr = null;
  sb.profileErr = null;
  sb.plan = "free";
  sb.count = 0;
  sb.countErr = null;
  sb.countEq = null;
  sb.insertErr = null;
  sb.inserted = [];
});

describe("POST /api/analyze — аутентификация и квота", () => {
  it("401 без заголовка Authorization", async () => {
    const res = await POST(makeReq({ url: VALID_URL, mode: "summary" }, { auth: null }));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("auth_required");
  });

  it("401, если токен невалиден (getUser без пользователя)", async () => {
    sb.user = null;
    const res = await POST(makeReq({ url: VALID_URL, mode: "summary" }));
    expect(res.status).toBe(401);
  });

  it("402, когда лимит месяца исчерпан", async () => {
    sb.count = 10; // free-лимит = 10
    const res = await POST(makeReq({ url: VALID_URL, mode: "summary" }));
    expect(res.status).toBe(402);
    expect((await res.json()).code).toBe("quota_exceeded");
  });

  it("503, если не удалось проверить лимит", async () => {
    sb.countErr = new Error("db unavailable");
    const res = await POST(makeReq({ url: VALID_URL, mode: "summary" }));
    expect(res.status).toBe(503);
  });
});

describe("POST /api/analyze — валидация (с авторизацией)", () => {
  it("400 на битый JSON", async () => {
    expect((await POST(makeReq(null, { broken: true }))).status).toBe(400);
  });
  it("400, если не указан url", async () => {
    expect((await POST(makeReq({ mode: "summary" }))).status).toBe(400);
  });
  it("400 при неизвестном режиме", async () => {
    expect((await POST(makeReq({ url: VALID_URL, mode: "nonsense" }))).status).toBe(400);
  });
  it("400, если в режиме qa нет вопроса", async () => {
    expect((await POST(makeReq({ url: VALID_URL, mode: "qa", question: "  " }))).status).toBe(400);
  });
  it("400 при ссылке не на YouTube", async () => {
    expect((await POST(makeReq({ url: "https://vimeo.com/123", mode: "summary" }))).status).toBe(400);
  });
});

describe("POST /api/analyze — основной поток", () => {
  it("возвращает разбор и сохраняет его, отдаёт usage", async () => {
    vi.mocked(fetchTranscript).mockResolvedValue({
      plainText: "текст",
      timedText: "[0:00] текст",
      lang: "ru",
      availableLangs: ["ru"],
    });
    vi.mocked(chatCompletion).mockResolvedValue("готовый разбор");

    const res = await POST(makeReq({ url: VALID_URL, mode: "summary", lang: "ru" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({
      videoId: "dQw4w9WgXcQ",
      analysis: "готовый разбор",
      saved: true,
      usage: { used: 1, limit: 10, plan: "free" },
    });
    expect(sb.countEq).toEqual({ column: "user_id", value: "u1" });
    expect(sb.inserted).toHaveLength(1); // разбор сохранён на сервере
  });

  it("возвращает готовый разбор с предупреждением, если история не сохранилась", async () => {
    vi.mocked(fetchTranscript).mockResolvedValue({
      plainText: "текст",
      timedText: "[0:00] текст",
      lang: "ru",
      availableLangs: ["ru"],
    });
    vi.mocked(chatCompletion).mockResolvedValue("готовый разбор");
    sb.insertErr = new Error("insert failed");

    const res = await POST(makeReq({ url: VALID_URL, mode: "summary", lang: "ru" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({
      analysis: "готовый разбор",
      saved: false,
      usage: { used: 0, limit: 10, plan: "free" },
    });
    expect(data.warning).toContain("не сохранился");
    expect(sb.inserted).toHaveLength(0);
  });

  it("пробрасывает статус ошибки от Supadata", async () => {
    vi.mocked(fetchTranscript).mockRejectedValue(new SupadataError("нет субтитров", 404));
    const res = await POST(makeReq({ url: VALID_URL, mode: "summary" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("нет субтитров");
  });

  it("отдаёт 500 на неожиданной ошибке", async () => {
    vi.mocked(fetchTranscript).mockRejectedValue(new Error("boom"));
    expect((await POST(makeReq({ url: VALID_URL, mode: "summary" }))).status).toBe(500);
  });
});
