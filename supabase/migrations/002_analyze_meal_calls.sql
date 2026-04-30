-- analyze-meal API の呼び出し回数を記録するテーブル
-- 用途: 1日あたりの呼び出し回数で free=3 / premium=30 のレート制限を行う

create table if not exists public.analyze_meal_calls (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  called_at   timestamptz not null default now()
);

create index if not exists analyze_meal_calls_user_id_called_at_idx
  on public.analyze_meal_calls (user_id, called_at desc);

alter table public.analyze_meal_calls enable row level security;

create policy "analyze_meal_calls: own rows only"
  on public.analyze_meal_calls for all
  using (auth.uid() = user_id);
