// Тарифы и лимиты на число разборов в месяц.
// Используется и на клиенте (показ счётчика, форма подписки), и на сервере
// (жёсткая проверка квоты в /api/analyze).

export type Plan = "free" | "pro20" | "pro100" | "pro200";

/** Сколько разборов в месяц разрешено каждому плану. */
export const PLAN_LIMITS: Record<Plan, number> = {
  free: 10,
  pro20: 500,
  pro100: 3000,
  pro200: 7000,
};

/** Платные тарифы для формы подписки. */
export const PAID_PLANS: {
  id: Exclude<Plan, "free">;
  title: string;
  price: number; // $/мес
  limit: number; // разборов/мес
}[] = [
  { id: "pro20", title: "Старт", price: 20, limit: PLAN_LIMITS.pro20 },
  { id: "pro100", title: "Про", price: 100, limit: PLAN_LIMITS.pro100 },
  { id: "pro200", title: "Макс", price: 200, limit: PLAN_LIMITS.pro200 },
];

export function isPlan(value: unknown): value is Plan {
  return value === "free" || value === "pro20" || value === "pro100" || value === "pro200";
}

export function planLimit(plan: string | null | undefined): number {
  return isPlan(plan) ? PLAN_LIMITS[plan] : PLAN_LIMITS.free;
}

/** ISO-строка начала текущего календарного месяца (UTC) — граница для подсчёта. */
export function monthStartISO(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
