// Серверный клиент Supabase, действующий ОТ ИМЕНИ пользователя (по его JWT).
// Все запросы идут под политиками RLS этого пользователя, а getUser()
// проверяет подлинность токена. Используется в /api/analyze для гейтинга.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getServerClientForToken(token: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
