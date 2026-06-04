"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Показывается только когда нужно подтверждение email письмом.
  // При autoconfirm пользователя сразу перекидываем на анализатор.
  const [sentConfirm, setSentConfirm] = useState(false);

  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!EMAIL_RE.test(email.trim())) {
      setError("Введите корректный email.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`);
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают.");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Регистрация пока не настроена: не заданы ключи Supabase.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) {
        setError(signUpError.message || "Не удалось зарегистрироваться. Попробуйте ещё раз.");
      } else if (data.session) {
        // Аккаунт сразу активен (autoconfirm) — отправляем прямо к анализатору.
        router.push("/");
        router.refresh();
        return; // не снимаем loading: идёт переход
      } else {
        // Сессии нет — проект требует подтверждения email письмом.
        setSentConfirm(true);
      }
    } catch {
      setError("Не удалось связаться с сервером регистрации. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  }

  if (sentConfirm) {
    return (
      <div className="card bevel-out">
        <span className="ribbon blue">Почти готово</span>
        <p>
          ✓ Аккаунт создан. Мы отправили письмо для подтверждения на{" "}
          <b>{email.trim()}</b> — перейдите по ссылке из письма, затем{" "}
          <Link href="/login">войдите</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="card bevel-out">
      <span className="ribbon red">Регистрация</span>

      {!configured && (
        <div className="note" style={{ marginBottom: 12 }}>
          ⓘ Регистрация заработает после того, как будут заданы переменные
          окружения <b>NEXT_PUBLIC_SUPABASE_URL</b> и{" "}
          <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b>.
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
            Пароль (минимум {MIN_PASSWORD_LENGTH} символов)
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <label className="field-label" htmlFor="confirm">
            Повторите пароль
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error && (
          <div className="error-box" style={{ marginTop: 16 }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Регистрирую…" : "Зарегистрироваться ▶"}
          </button>
        </div>
      </form>
    </div>
  );
}
