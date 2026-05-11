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
| `foods` | 食品マスタ（文科省 食品成分表ベース）。検索でカロリーを参照 |

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
| `gender` | text | `'female'` または `'male'`（null 可）。基礎代謝計算で使う |
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
| `protein` | numeric | たんぱく質（g、null可） |
| `fat` | numeric | 脂質（g、null可） |
| `carbs` | numeric | 炭水化物（g、null可） |
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

### foods

文科省「日本食品標準成分表(八訂)」をベースにした食品マスタ。
ユーザー間で共有される参照データ（read-only public）。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid | 主キー |
| `food_code` | text | 文科省の食品番号（unique） |
| `name` | text | 食品名（文科省表記） |
| `name_kana` | text | 検索用カナ（null可） |
| `category` | text | 食品群（例: `穀類`、`肉類`） |
| `calories_per_100g` | numeric | エネルギー（kcal/100g） |
| `protein_per_100g` | numeric | たんぱく質（g/100g、null可） |
| `fat_per_100g` | numeric | 脂質（g/100g、null可） |
| `carbs_per_100g` | numeric | 炭水化物（g/100g、null可） |
| `is_common` | boolean | よく食べる代表食品フラグ（検索結果で優先） |
| `display_name` | text | 表示用の人にやさしい名前（null可。例: 「玄米ごはん」） |
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
  gender text check (gender in ('female', 'male')),
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
  protein numeric(5,1),
  fat numeric(5,1),
  carbs numeric(5,1),
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

-- foods テーブル（食品マスタ）
create extension if not exists pg_trgm;

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  food_code text unique not null,
  name text not null,
  name_kana text,
  category text not null,
  calories_per_100g numeric(6,1) not null,
  protein_per_100g numeric(5,1),
  fat_per_100g numeric(5,1),
  carbs_per_100g numeric(5,1),
  is_common boolean not null default false,
  display_name text,
  created_at timestamptz not null default now()
);

-- 部分一致検索の高速化（pg_trgm GIN index）
create index foods_name_trgm_idx         on public.foods using gin (name gin_trgm_ops);
create index foods_name_kana_trgm_idx    on public.foods using gin (name_kana gin_trgm_ops);
create index foods_display_name_trgm_idx on public.foods using gin (display_name gin_trgm_ops);
-- 代表食品を優先表示するため
create index foods_is_common_idx on public.foods (is_common) where is_common = true;

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

### 既存環境向けマイグレーション（gender カラム追加）

`gender` カラムを後から追加する場合：

```sql
alter table public.users
  add column gender text check (gender in ('female', 'male'));
```

### 既存環境向けマイグレーション（foods キュレーション列の追加）

`is_common` / `display_name` を後から追加する場合：

```sql
alter table public.foods
  add column if not exists is_common boolean not null default false,
  add column if not exists display_name text;

create index if not exists foods_display_name_trgm_idx
  on public.foods using gin (display_name gin_trgm_ops);

create index if not exists foods_is_common_idx
  on public.foods (is_common) where is_common = true;
```

その後 `docs/curate-foods.sql` を流すと、代表食品80件にフラグと表示名が付きます。

### 既存環境向けマイグレーション（PFC 列の追加）

`foods` と `meal_logs` にたんぱく質・脂質・炭水化物を追加：

```sql
alter table public.foods
  add column if not exists protein_per_100g numeric(5,1),
  add column if not exists fat_per_100g     numeric(5,1),
  add column if not exists carbs_per_100g   numeric(5,1);

alter table public.meal_logs
  add column if not exists protein numeric(5,1),
  add column if not exists fat     numeric(5,1),
  add column if not exists carbs   numeric(5,1);
```

その後 `npm run seed:foods <xlsx>` を再実行すると、PFC 列も埋まります（既存行は upsert で更新）。

---

## RLS（Row Level Security）

各テーブルに RLS を有効にし、自分のデータのみアクセス可能にする：

```sql
-- RLS を有効化
alter table public.users enable row level security;
alter table public.meal_logs enable row level security;
alter table public.body_logs enable row level security;
alter table public.coach_messages enable row level security;
alter table public.foods enable row level security;

-- ポリシー（自分のレコードのみ操作可能）
create policy "users: own record" on public.users
  for all using (auth.uid() = id);

create policy "meal_logs: own records" on public.meal_logs
  for all using (auth.uid() = user_id);

create policy "body_logs: own records" on public.body_logs
  for all using (auth.uid() = user_id);

create policy "coach_messages: own records" on public.coach_messages
  for all using (auth.uid() = user_id);

-- foods は認証済みユーザーなら誰でも参照可（書き込みは service_role 経由のみ）
create policy "foods: authenticated read" on public.foods
  for select using (auth.role() = 'authenticated');
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
