"use client";

// Форма выбора тарифа (демо: реальная оплата не подключена — выбор просто
// включает план в profiles, лимит разборов в месяц обновляется сразу).
import { useState } from "react";
import { ALL_PLANS, type Plan } from "@/lib/plans";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";

export default function SubscriptionPlans({ reason }: { reason?: string }) {
  const { user, usage, refreshUsage } = useAuth();
  const [busy, setBusy] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(planId: Plan) {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    setBusy(planId);
    setError(null);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ plan: planId })
      .eq("id", user.id);
    if (updateError) {
      setError("Не удалось включить тариф. Попробуйте ещё раз.");
    } else {
      await refreshUsage();
    }
    setBusy(null);
  }

  return (
    <div className="card bevel-out">
      <h2 className="plans-head">Тарифы</h2>
      {reason && <p className="note" style={{ marginBottom: 14 }}>{reason}</p>}

      <div className="plans">
        {ALL_PLANS.map((p) => {
          const current = usage?.plan === p.id;
          const isFree = p.id === "free";
          return (
            <div key={p.id} className={`plan bevel-in ${current ? "plan-current" : ""}`}>
              <div className="plan-title">{p.title}</div>
              <div className="plan-price">
                {isFree ? (
                  "Бесплатно"
                ) : (
                  <>
                    ${p.price}
                    <span>/мес</span>
                  </>
                )}
              </div>
              <div className="plan-limit">
                {p.limit.toLocaleString("ru-RU")} разборов в месяц
              </div>
              <button
                type="button"
                className="btn"
                disabled={busy !== null || current}
                onClick={() => choose(p.id)}
              >
                {current
                  ? "Текущий тариф"
                  : busy === p.id
                    ? "Включаю…"
                    : isFree
                      ? "Перейти на free"
                      : "Выбрать"}
              </button>
            </div>
          );
        })}
      </div>

      {error && <div className="error-box" style={{ marginTop: 14 }}>⚠ {error}</div>}

      <p className="note" style={{ marginTop: 14 }}>
        Демо-режим: оплата не списывается, тариф включается сразу. Лимит
        обновляется в начале каждого месяца.
      </p>
    </div>
  );
}
