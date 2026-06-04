import { describe, it, expect } from "vitest";
import { PLAN_LIMITS, PAID_PLANS, planLimit, isPlan, monthStartISO } from "@/lib/plans";

describe("lib/plans", () => {
  it("лимиты соответствуют тарифам", () => {
    expect(PLAN_LIMITS).toEqual({ free: 10, pro20: 500, pro100: 3000, pro200: 7000 });
  });

  it("три платных тарифа с верными ценами/лимитами", () => {
    expect(PAID_PLANS.map((p) => [p.price, p.limit])).toEqual([
      [20, 500],
      [100, 3000],
      [200, 7000],
    ]);
  });

  it("planLimit для неизвестного значения = free", () => {
    expect(planLimit("free")).toBe(10);
    expect(planLimit("pro100")).toBe(3000);
    expect(planLimit("хрень")).toBe(10);
    expect(planLimit(null)).toBe(10);
  });

  it("isPlan распознаёт только валидные планы", () => {
    expect(isPlan("pro20")).toBe(true);
    expect(isPlan("gold")).toBe(false);
  });

  it("monthStartISO — первое число текущего месяца в UTC", () => {
    const iso = monthStartISO(new Date(Date.UTC(2026, 5, 17, 12, 30)));
    expect(iso).toBe("2026-06-01T00:00:00.000Z");
  });
});
