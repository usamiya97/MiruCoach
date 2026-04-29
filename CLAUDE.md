# MiruCoach — CLAUDE.md

## プロジェクト概要

30〜40代フルタイム勤務女性をターゲットにした
AIパーソナルコーチ×カロリー管理Webアプリ。

コンセプト：「我慢じゃなく、仕組みで痩せる」

- 写真1枚撮るだけのカロリー記録（GPT-4o Vision）
- AIコーチとの毎日の会話（Claude API）
- サボった日も責めない継続設計

## 技術スタック

- フロント：Next.js 14（App Router）+ TypeScript + Tailwind CSS
- バックエンド：Supabase（DB / 認証 / Edge Functions）
- AIコーチ：Anthropic Claude API（claude-sonnet-4-20250514）
- 画像解析：OpenAI GPT-4o Vision API
- 決済：Stripe（月額980円サブスク）
- デプロイ：Vercel

## ディレクトリ構成

src/
├── app/
│ ├── (auth)/
│ │ ├── login/page.tsx
│ │ └── signup/page.tsx
│ ├── (app)/
│ │ ├── dashboard/page.tsx
│ │ ├── meal/page.tsx
│ │ └── coach/page.tsx
│ ├── api/
│ │ ├── analyze-meal/route.ts # GPT-4o Vision
│ │ ├── coach/route.ts # Claude API
│ │ └── stripe/webhook/route.ts
│ └── layout.tsx
├── components/
│ ├── ui/ # 汎用UIコンポーネント
│ ├── meal/ # 食事記録関連
│ └── coach/ # コーチチャット関連
├── lib/
│ ├── supabase/
│ │ ├── client.ts # ブラウザ用
│ │ └── server.ts # サーバー用
│ ├── openai.ts
│ ├── anthropic.ts
│ └── stripe.ts
└── types/
└── index.ts

## DBスキーマ（Supabase / PostgreSQL）

### users（Supabaseのauth.usersを拡張）

- id: uuid (FK → auth.users)
- plan: text ('free' | 'premium') default 'free'
- stripe_customer_id: text
- coach_name: text default 'ミル'
- coach_tone: text ('gentle' | 'logical') default 'gentle'
- created_at: timestamptz

### meal_logs

- id: uuid PK
- user_id: uuid (FK → users)
- photo_url: text
- calories: integer
- meal_type: text ('breakfast' | 'lunch' | 'dinner' | 'snack')
- note: text
- logged_at: timestamptz

### body_logs

- id: uuid PK
- user_id: uuid (FK → users)
- weight: numeric(4,1)
- logged_at: timestamptz

### coach_messages

- id: uuid PK
- user_id: uuid (FK → users)
- role: text ('user' | 'assistant')
- content: text
- created_at: timestamptz

## コーディングルール

- 型はすべてTypeScriptで厳密に定義する（any禁止）
- Supabaseクライアントはサーバーコンポーネントとクライアントで使い分ける
- APIルートは必ずtry-catchでエラーハンドリングする
- 環境変数は必ず.env.localで管理し、ハードコード禁止
- コンポーネントはなるべく小さく分割する
- CSSはTailwindのみ使用。カスタムCSSは原則書かない

## 環境変数（.env.local）

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

## AIコーチ仕様

### システムプロンプト（coach/route.tsで使用）

あなたは「ミル」という名前のパーソナルダイエットコーチです。

【ターゲット】30〜40代のフルタイム勤務女性
【コーチの性格】論理的だが温かみがある。データを根拠に話す。
【絶対に守るルール】

- サボった日・食べ過ぎた日を責めない
- 「また明日から頑張ろう」ではなく「今日の夕食でリカバリーできる」など具体的に返す
- 長文にしない（3文以内を基本とする）
- ユーザーの食事履歴・体重推移を必ずコンテキストに含めて返答する
- 医療的なアドバイスはしない

### コンテキストに含めるデータ

- 直近7日分のmeal_logs（calories合計）
- 直近7日分のbody_logs
- 直近20件のcoach_messages（会話履歴）

## MVP完成の定義

以下がすべて動いたらMVP完成とみなす

- [ ] メール認証でサインアップ・ログインできる
- [ ] 写真を撮影してカロリーが自動記録される
- [ ] AIコーチと会話できる（履歴が保持される）
- [ ] 体重を手入力で記録できる
- [ ] Stripeで月額980円の課金ができる
- [ ] 未課金ユーザーはコーチ機能にアクセスできない

## やらないこと（MVP対象外）

- 栄養素の詳細分析（PFC等）
- 運動記録
- 献立提案
- SNS連携
- プッシュ通知
- ネイティブアプリ化（MVP後に検討）

## 回答スタイル

- 結論ファースト
- 指摘すべきことは素直に指摘
