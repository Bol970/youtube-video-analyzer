import { describe, it, expect, beforeEach, vi } from "vitest";

// Модуль кэширует singleton-клиент, поэтому сбрасываем кэш модулей перед
// каждым тестом и импортируем свежую копию.
async function freshModule() {
  vi.resetModules();
  return import("@/lib/supabase");
}

describe("lib/supabase", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("isSupabaseConfigured() = false без ключей", async () => {
    const { isSupabaseConfigured, getSupabaseClient } = await freshModule();
    expect(isSupabaseConfigured()).toBe(false);
    expect(getSupabaseClient()).toBeNull();
  });

  it("isSupabaseConfigured() = true и клиент создаётся при заданных ключах", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    const { isSupabaseConfigured, getSupabaseClient } = await freshModule();
    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabaseClient()).not.toBeNull();
  });
});
