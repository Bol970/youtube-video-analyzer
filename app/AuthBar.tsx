"use client";

// Полоса аутентификации в шапке (видна на всех страницах).
// Для гостя — ссылки «Войти / Регистрация», для залогиненного — email и выход.
// Рендерится всегда (в т.ч. при SSR и пока грузится сессия), чтобы вход в
// регистрацию был доступен независимо от состояния клиента.
import Link from "next/link";
import { useAuth } from "./AuthProvider";

export default function AuthBar() {
  const { user, signOut } = useAuth();

  return (
    <nav className="auth-bar">
      {user ? (
        <>
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
