"use client";

// Контекст аутентификации: следит за сессией Supabase, а также за тарифом и
// расходом разборов за текущий месяц. Используется шапкой, формой и историей.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { planLimit, monthStartISO, type Plan } from "@/lib/plans";

interface Usage {
  plan: Plan;
  used: number;
  limit: number;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  usage: Usage | null;
  refreshUsage: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<Usage | null>(null);

  const userId = session?.user?.id ?? null;

  // Загружает тариф пользователя и число разборов за текущий месяц.
  const refreshUsage = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !userId) {
      setUsage(null);
      return;
    }
    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from("profiles").select("plan").eq("id", userId).single(),
      supabase
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStartISO()),
    ]);
    const plan = (profile?.plan ?? "free") as Plan;
    setUsage({ plan, used: count ?? 0, limit: planLimit(plan) });
  }, [userId]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // При смене пользователя обновляем счётчик расхода.
  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  async function signOut() {
    await getSupabaseClient()?.auth.signOut();
    setUsage(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        configured: isSupabaseConfigured(),
        usage,
        refreshUsage,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен использоваться внутри <AuthProvider>");
  return ctx;
}
