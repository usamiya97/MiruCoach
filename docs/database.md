# データベース設計

Supabase（PostgreSQL）を使用。

---

## テーブル一覧

| テーブル | 役割 |
|---|---|
| `users` | ユーザープロフィール・プラン・コーチ設定（auth.users の拡張） |
| `meal_logs` | 食事記録（カロリー・写真・メモ） |
| `body_logs` | 体重記録 |
| `coach_messages` | AIコーチとのチャット履歴 |

---

## テーブル定義

### users

Supabase の `auth.users` を拡張したテーブル。
認証（メール・パスワード）は Supabase Auth が管理し、このテーブルはアプリ固有の情報を保持する。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | 主キー。`auth.users.id` と同じ値 |
| `plan` | text | `'free'` または `'premium'`。デフォルト `'free'` |
| `stripe_customer_id` | text | Stripe 顧客 ID（課金後に設定） |
| `coach_name` | text | AIコーチの名前。デフォルト `'ミル'` |
| `coach_tone` | text | `'gentle'`（共感）または `'logical'`（データ重視） |
| `height` | numeric | 身長（cm）。オンボーディングで設定 |
| `goal_weight` | numeric | 目標体重（kg） |
| `age` | integer | 年齢 |
| `target_calories` | integer | 1日の目標摂取カロリー。デフォルト `1800` |
| `created_at` | timestamptz | 作成日時 |

### meal_logs

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | 主キー |
| `user_id` | uuid | FK → `users.id` |
| `photo_url` | text | 食事写真の URL（null 可） |
| `calories` | integer | カロリー（kcal） |
| `meal_type` | text | `'breakfast'` / `'lunch'` / `'dinner'` / `'snack'` |
| `note` | text | メモ・料理名（null 可） |
| `logged_at` | timestamptz | 記録日時 |

### body_logs

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | 主キー |
| `user_id` | uuid | FK → `users.id` |
| `weight` | numeric(4,1) | 体重（kg）。小数点1桁 |
| `logged_at` | timestamptz | 記録日時 |

### coach_messages

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | 主キー |
| `user_id` | uuid | FK → `users.id` |
| `role` | text | `'user'` または `'assistant'` |
| `content` | text | メッセージ本文 |
| `created_at` | timestamptz | 作成日時 |

---

## SQL（Supabase SQL Editor で実行）

```sql
-- users テーブル
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  stripe_customer_id text,
  coach_name text not null default 'ミル',
  coach_tone text not null default 'gentle' check (coach_tone in ('gentle', 'logical')),
  height numeric,
  goal_weight numeric,
  age integer,
  target_calories integer not null default 1800,
  created_at timestamptz not null default now()
);

-- meal_logs テーブル
create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  photo_url text,
  calories integer not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  note text,
  logged_at timestamptz not null default now()
);

-- body_logs テーブル
create table public.body_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  weight numeric(4,1) not null,
  logged_at timestamptz not null default now()
);

-- coach_messages テーブル
create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- 新規ユーザー登録時に users レコードを自動作成するトリガー
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## RLS（Row Level Security）

各テーブルに RLS を有効にし、自分のデータのみアクセス可能にする：

```sql
-- RLS を有効化
alter table public.users enable row level security;
alter table public.meal_logs enable row level security;
alter table public.body_logs enable row level security;
alter table public.coach_messages enable row level security;

-- ポリシー（自分のレコードのみ操作可能）
create policy "users: own record" on public.users
  for all using (auth.uid() = id);

create policy "meal_logs: own records" on public.meal_logs
  for all using (auth.uid() = user_id);

create policy "body_logs: own records" on public.body_logs
  for all using (auth.uid() = user_id);

create policy "coach_messages: own records" on public.coach_messages
  for all using (auth.uid() = user_id);
```

> **注意：** Stripe Webhook の処理（plan の更新）は RLS をバイパスするため `SUPABASE_SERVICE_ROLE_KEY` を使った Admin クライアントを使用している。

---

## テーブルの関係

```
auth.users （Supabase 管理）
    │
    └── users （アプリ拡張）
            │
            ├── meal_logs
            ├── body_logs
            └── coach_messages
```
