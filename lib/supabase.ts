// Браузерный клиент Supabase для регистрации пользователей.
// Ключи берутся из публичных env-переменных (доступны в браузере):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
// anon key — публичный по дизайну Supabase; доступ к данным ограничивается
// политиками Row Level Security на стороне БД, а не секретностью ключа.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Сконфигурирован ли Supabase (заданы ли публичные ключи). */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Возвращает singleton-клиент Supabase или null, если ключи ещё не заданы.
 * null позволяет показать понятное сообщение вместо падения приложения.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
    );
  }
  return client;
}
