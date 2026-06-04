"use client";

// Полоса аутентификации в шапке: показывает email и кнопку выхода для
// залогиненного пользователя, либо ссылки «Войти / Регистрация» для гостя.
import Link from "next/link";
import { useAuth } from "./AuthProvider";

export default function AuthBar() {
  const { user, loading, configured, signOut } = useAuth();

  if (!configured || loading) return null;

  return (
    <nav className="auth-bar">
      {user ? (
        <>
          <Link href="/history">Мои анализы</Link>
          <span className="auth-email">{user.email}</span>
          <button type="button" className="btn-mini" onClick={() => signOut()}>
            Выйти
          </button>
        </>
      ) : (
        <>
          <Link href="/login">Войти</Link>
          <Link href="/register">Регистрация</Link>
        </>
      )}
    </nav>
  );
}
