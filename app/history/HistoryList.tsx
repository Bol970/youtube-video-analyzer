"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { AnalysisMode } from "@/lib/prompts";
import { renderMarkdown } from "@/lib/markdown";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "../AuthProvider";

interface AnalysisRow {
  id: string;
  video_id: string;
  mode: AnalysisMode;
  question: string | null;
  lang: string | null;
  analysis: string;
  created_at: string;
}

const MODE_TITLES: Record<AnalysisMode, string> = {
  summary: "Краткое summary",
  keypoints: "Ключевые тезисы",
  chapters: "Главы / таймкоды",
  qa: "Вопрос-ответ",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryList() {
  const { user, loading: authLoading, configured } = useAuth();
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    setLoading(true);
    setError(null);
    const { data, error: selectError } = await supabase
      .from("analyses")
      .select("id, video_id, mode, question, lang, analysis, created_at")
      .order("created_at", { ascending: false });
    if (selectError) {
      setError("Не удалось загрузить разборы.");
    } else {
      setRows((data ?? []) as AnalysisRow[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) load();
    if (!authLoading && !user) setLoading(false);
  }, [authLoading, user, load]);

  async function handleDelete(id: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error: deleteError } = await supabase.from("analyses").delete().eq("id", id);
    if (!deleteError) setRows((prev) => prev.filter((r) => r.id !== id));
  }

  if (!configured) {
    return (
      <div className="card bevel-out">
        <p className="note">
          ⓘ Раздел недоступен: не заданы ключи Supabase.
        </p>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="card bevel-out">
        <p>Загрузка…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card bevel-out">
        <p>
          Чтобы видеть свои разборы, <Link href="/login">войдите</Link> или{" "}
          <Link href="/register">зарегистрируйтесь</Link>.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bevel-out">
        <div className="error-box">⚠ {error}</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="card bevel-out">
        <p>
          Пока пусто. <Link href="/">Разобрать первое видео →</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="card bevel-out">
      <span className="ribbon blue">Мои разборы</span>
      <ul className="history-list">
        {rows.map((row) => (
          <li key={row.id} className="history-item bevel-in">
            <div className="history-head">
              <div>
                <b>{MODE_TITLES[row.mode] ?? row.mode}</b>
                {row.question && <span className="history-q"> — «{row.question}»</span>}
                <div className="meta-line">
                  <a
                    href={`https://www.youtube.com/watch?v=${row.video_id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {row.video_id}
                  </a>
                  {row.lang ? ` · ${row.lang}` : ""} · {formatDate(row.created_at)}
                </div>
              </div>
              <div className="toolbar">
                <button
                  type="button"
                  className="btn-mini"
                  onClick={() => setOpenId(openId === row.id ? null : row.id)}
                >
                  {openId === row.id ? "Свернуть" : "Открыть"}
                </button>
                <button
                  type="button"
                  className="btn-mini"
                  onClick={() => handleDelete(row.id)}
                >
                  Удалить
                </button>
              </div>
            </div>
            {openId === row.id && (
              <div
                className="result"
                style={{ marginTop: 10 }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(row.analysis) }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
