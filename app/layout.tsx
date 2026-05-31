import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouTube Video Analyzer — анализ видео через ИИ",
  description:
    "Вставь ссылку на YouTube-видео — получи краткое summary, ключевые тезисы, главы или ответ на свой вопрос. Транскрипт через Supadata, анализ через OpenRouter LLM.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
