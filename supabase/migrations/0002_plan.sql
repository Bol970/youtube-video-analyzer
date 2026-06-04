-- Миграция 0002 — тарифный план пользователя.
-- Лимиты на число разборов в месяц зависят от плана; сам подсчёт идёт
-- по числу строк в analyses за текущий календарный месяц.

alter table public.profiles
  add column if not exists plan text not null default 'free'
  check (plan in ('free', 'pro20', 'pro100', 'pro200'));
