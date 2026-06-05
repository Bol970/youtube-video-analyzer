"use client";

// Полоса аутентификации в шапке (видна на всех страницах).
// Для гостя — ссылки «Войти / Регистрация», для залогиненного — остаток
// разборов за месяц, email и выход.
import Link from "next/link";
import { planTitle } from "@/lib/plans";
import { useAuth } from "./AuthProvider";

export default function AuthBar() {
  const { user, usage, signOut } = useAuth();

  return (
    <nav className="auth-bar">
      {user ? (
        <>
          <Link href="/" className="btn-new">+ Новый разбор</Link>
          {usage && (
            <span className="auth-quota">
              Разборов: <b>{Math.min(usage.used, usage.limit)}</b> из {usage.limit}
            </span>
          )}
          {usage && (
            <span className="auth-plan">Тариф: <b>{planTitle(usage.plan)}</b></span>
          )}
          <Link href="/pricing" className="btn-mini">Сменить план</Link>
          <Link href="/history">Мои разборы</Link>
          <span className="auth-email">{user.email}</span>
          <button type="button" className="btn-mini" onClick={() => signOut()}>
            Выйти
          </button>
        </>
      ) : (
        <>
          <span className="auth-label">Аккаунт:</span>
          <Link href="/login">Войти</Link>
          <Link href="/register">Регистрация</Link>
        </>
      )}
    </nav>
  );
}
