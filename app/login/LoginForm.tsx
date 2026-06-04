"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Вход пока не настроен: не заданы ключи Supabase.");
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(
          signInError.message === "Invalid login credentials"
            ? "Неверный email или пароль."
            : signInError.message || "Не удалось войти. Попробуйте ещё раз."
        );
      } else {
        // Сессия установлена — возвращаемся к разбору.
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Не удалось связаться с сервером. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card bevel-out">
      <span className="ribbon red">Вход</span>

      {!configured && (
        <div className="note" style={{ marginBottom: 12 }}>
          ⓘ Вход заработает после задания переменных окружения{" "}
          <b>NEXT_PUBLIC_SUPABASE_URL</b> и <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b>.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <label className="field-label" htmlFor="password">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="error-box" style={{ marginTop: 16 }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Вхожу…" : "Войти ▶"}
          </button>
        </div>
      </form>

      <p className="note" style={{ marginTop: 16 }}>
        Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
      </p>
    </div>
  );
}
