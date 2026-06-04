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

/** Человекочитаемые названия и цены тарифов. */
export const PLAN_TITLES: Record<Plan, string> = {
  free: "Бесплатный",
  pro20: "Старт",
  pro100: "Про",
  pro200: "Макс",
};
export const PLAN_PRICES: Record<Plan, number> = {
  free: 0,
  pro20: 20,
  pro100: 100,
  pro200: 200,
};

export interface PlanInfo {
  id: Plan;
  title: string;
  price: number; // $/мес
  limit: number; // разборов/мес
}

/** Платные тарифы (без free). */
export const PAID_PLANS: PlanInfo[] = [
  { id: "pro20", title: PLAN_TITLES.pro20, price: 20, limit: PLAN_LIMITS.pro20 },
  { id: "pro100", title: PLAN_TITLES.pro100, price: 100, limit: PLAN_LIMITS.pro100 },
  { id: "pro200", title: PLAN_TITLES.pro200, price: 200, limit: PLAN_LIMITS.pro200 },
];

/** Все тарифы для формы выбора, включая бесплатный (для перехода обратно). */
export const ALL_PLANS: PlanInfo[] = [
  { id: "free", title: PLAN_TITLES.free, price: 0, limit: PLAN_LIMITS.free },
  ...PAID_PLANS,
];

export function planTitle(plan: string | null | undefined): string {
  return isPlan(plan) ? PLAN_TITLES[plan] : PLAN_TITLES.free;
}

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
