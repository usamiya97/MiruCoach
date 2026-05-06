-- API レート制限用の汎用呼び出しログ
-- 用途: /api/coach, /api/stripe/* などの呼び出しを user_id × endpoint 単位で計測し
--       スライディングウィンドウでの上限超過を判定する
--
-- analyze_meal_calls との違い:
--   analyze_meal_calls は「日次の枠を消費するクォータ」（UI に残量を表示する）
--   api_rate_limits は「短時間の濫用を防ぐ防壁」（残量はユーザーに見せない）

create table if not exists public.api_rate_limits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  endpoint    text not null,
  called_at   timestamptz not null default now()
);

create index if not exists api_rate_limits_user_endpoint_called_at_idx
  on public.api_rate_limits (user_id, endpoint, called_at desc);

-- 古いログを定期的に消すための補助インデックス（pg_cron などで cleanup する想定）
create index if not exists api_rate_limits_called_at_idx
  on public.api_rate_limits (called_at);

alter table public.api_rate_limits enable row level security;

create policy "api_rate_limits: own rows only"
  on public.api_rate_limits for all
  using (auth.uid() = user_id);
