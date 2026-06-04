-- Миграция 0001 — начальная схема для YouTube Video Analyzer.
-- Хранит историю анализов, привязанную к зарегистрированному пользователю.
-- Доступ ограничивается политиками Row Level Security: каждый видит только свои строки.

-- ============================================================
-- Таблица: profiles — публичный профиль пользователя.
-- Зеркало auth.users (управляемой Supabase) для доп. полей приложения.
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Пользователь читает/меняет только свой профиль.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Профиль создаётся автоматически триггером при регистрации (см. ниже),
-- но разрешим и явную вставку своей строки на всякий случай.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- Таблица: analyses — история выполненных анализов видео.
-- ============================================================
create table if not exists public.analyses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  video_id    text not null,
  mode        text not null check (mode in ('summary', 'keypoints', 'chapters', 'qa')),
  question    text,                       -- заполняется только для режима qa
  lang        text,                       -- язык транскрипта
  analysis    text not null,              -- результат от LLM
  created_at  timestamptz not null default now()
);

create index if not exists analyses_user_id_created_at_idx
  on public.analyses (user_id, created_at desc);

alter table public.analyses enable row level security;

-- Каждая политика ограничивает строки владельцем (auth.uid() = user_id).
drop policy if exists "analyses_select_own" on public.analyses;
create policy "analyses_select_own"
  on public.analyses for select
  using (auth.uid() = user_id);

drop policy if exists "analyses_insert_own" on public.analyses;
create policy "analyses_insert_own"
  on public.analyses for insert
  with check (auth.uid() = user_id);

drop policy if exists "analyses_delete_own" on public.analyses;
create policy "analyses_delete_own"
  on public.analyses for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Триггер: при создании пользователя в auth.users автоматически
-- заводим строку в public.profiles.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
