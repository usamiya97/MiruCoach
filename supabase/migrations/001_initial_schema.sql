-- MiruCoach 初期スキーマ
-- Supabase SQL Editor に貼り付けて実行する

-- =====================
-- users テーブル（auth.users を拡張）
-- =====================
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  plan        text not null default 'free' check (plan in ('free', 'premium')),
  stripe_customer_id text,
  coach_name  text not null default 'ミル',
  coach_tone  text not null default 'gentle' check (coach_tone in ('gentle', 'logical')),
  created_at  timestamptz not null default now()
);

-- 新規サインアップ時に自動でレコードを作成するトリガー
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id)
  values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================
-- meal_logs テーブル
-- =====================
create table if not exists public.meal_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  photo_url   text,
  calories    integer not null,
  meal_type   text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  note        text,
  logged_at   timestamptz not null default now()
);

create index if not exists meal_logs_user_id_logged_at_idx
  on public.meal_logs (user_id, logged_at desc);

-- =====================
-- body_logs テーブル
-- =====================
create table if not exists public.body_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  weight      numeric(4,1) not null,
  logged_at   timestamptz not null default now()
);

create index if not exists body_logs_user_id_logged_at_idx
  on public.body_logs (user_id, logged_at desc);

-- =====================
-- coach_messages テーブル
-- =====================
create table if not exists public.coach_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists coach_messages_user_id_created_at_idx
  on public.coach_messages (user_id, created_at desc);

-- =====================
-- Row Level Security（RLS）
-- =====================
alter table public.users          enable row level security;
alter table public.meal_logs      enable row level security;
alter table public.body_logs      enable row level security;
alter table public.coach_messages enable row level security;

-- users: 自分のレコードのみ読み書き可
create policy "users: own row only"
  on public.users for all
  using (auth.uid() = id);

-- meal_logs: 自分のレコードのみ読み書き可
create policy "meal_logs: own rows only"
  on public.meal_logs for all
  using (auth.uid() = user_id);

-- body_logs: 自分のレコードのみ読み書き可
create policy "body_logs: own rows only"
  on public.body_logs for all
  using (auth.uid() = user_id);

-- coach_messages: 自分のレコードのみ読み書き可
create policy "coach_messages: own rows only"
  on public.coach_messages for all
  using (auth.uid() = user_id);
