# システム全体図

## ファイル構成と責務地図

```
mirucoach/
├── src/
│   ├── app/                        # Next.js App Router（ページ・API）
│   │   ├── page.tsx                # ランディングページ（未ログイン向け）
│   │   ├── layout.tsx              # 最外殻レイアウト（<html><body>）
│   │   │
│   │   ├── (auth)/                 # 認証系ページグループ（URLに影響しない）
│   │   │   ├── layout.tsx          # 共通：ロゴ入りピンクヘッダー
│   │   │   ├── login/page.tsx      # /login  → メール＋OTP ログイン
│   │   │   └── signup/page.tsx     # /signup → メール＋OTP 新規登録
│   │   │
│   │   ├── (app)/                  # アプリ本体ページグループ
│   │   │   ├── layout.tsx          # 共通：BottomNav
│   │   │   ├── dashboard/page.tsx  # /dashboard → カロリーリング・食事一覧・体重グラフ
│   │   │   ├── meal/page.tsx       # /meal     → 食事・体重記録
│   │   │   ├── coach/page.tsx      # /coach    → AIコーチチャット
│   │   │   └── settings/page.tsx   # /settings → プロフィール・目標設定
│   │   │
│   │   ├── onboarding/page.tsx     # /onboarding → 初回登録後の体型入力
│   │   ├── auth/callback/route.ts  # Supabase 認証コールバック処理
│   │   │
│   │   └── api/                    # API ルート（サーバーサイド処理）
│   │       ├── analyze-meal/route.ts   # POST /api/analyze-meal（GPT-4o Vision）
│   │       ├── coach/route.ts          # POST /api/coach（Claude API）
│   │       └── stripe/
│   │           ├── checkout/route.ts   # GET  /api/stripe/checkout（決済リンク生成）
│   │           └── webhook/route.ts    # POST /api/stripe/webhook（課金状態の反映）
│   │
│   ├── components/                 # 再利用可能な UI コンポーネント
│   │   ├── ui/
│   │   │   ├── BottomNav.tsx       # 下部ナビゲーションバー（全アプリページ共通）
│   │   │   ├── CalorieRing.tsx     # SVG 円グラフ（カロリー消費率）
│   │   │   ├── DateNavigator.tsx   # 日付ナビゲーション（‹ 日付 ›）
│   │   │   ├── WeightChart.tsx     # 体重推移グラフ（recharts）
│   │   │   ├── Button.tsx          # 汎用ボタン
│   │   │   └── Card.tsx            # 汎用カードコンテナ
│   │   ├── meal/
│   │   │   ├── MealCard.tsx        # 食事1件の表示・削除（2ステップ確認）
│   │   │   └── PhotoUpload.tsx     # 写真撮影→解析→記録の3ステップUI
│   │   └── coach/
│   │       ├── ChatMessage.tsx     # チャットメッセージバブル（左右切替）
│   │       └── ChatInput.tsx       # メッセージ入力欄＋送信ボタン
│   │
│   ├── lib/                        # 外部サービスの初期化・ユーティリティ
│   │   ├── supabase/
│   │   │   ├── client.ts           # ブラウザ用 Supabase クライアント
│   │   │   └── server.ts           # サーバー用 Supabase クライアント（Cookie対応）
│   │   ├── anthropic.ts            # Claude API クライアント初期化
│   │   ├── openai.ts               # OpenAI API クライアント初期化
│   │   ├── stripe.ts               # Stripe クライアント初期化
│   │   └── calories.ts             # 目標カロリー計算（Mifflin-St Jeor 式）
│   │
│   ├── middleware.ts               # ルートガード（認証チェック・リダイレクト）
│   └── types/index.ts              # TypeScript 型定義（全ファイル共通）
│
└── docs/                           # 設計ドキュメント
    ├── architecture.md             # このファイル（システム全体図）
    ├── database.md                 # DB テーブル設計
    ├── auth-flow.md                # 認証フロー
    └── api.md                      # API 仕様
```

---

## 責務の分類

### サーバーコンポーネント（データ取得はサーバーで完結）

| ファイル | やること |
|---|---|
| `app/page.tsx` | ログイン済みなら /dashboard へリダイレクト。未ログインなら LP を表示 |
| `app/(app)/dashboard/page.tsx` | URL の `?date=` を受け取り、Supabase から食事・体重・プロフィールを取得してレンダリング |

### クライアントコンポーネント（ユーザー操作が必要なもの）

| ファイル | やること |
|---|---|
| `app/(auth)/login/page.tsx` | OTP 送信→確認の2ステップ認証 UI |
| `app/(auth)/signup/page.tsx` | 同上（新規登録版） |
| `app/(app)/meal/page.tsx` | 食事・体重の記録フォーム、今日の記録一覧 |
| `app/(app)/coach/page.tsx` | AIコーチとのリアルタイムチャット |
| `app/(app)/settings/page.tsx` | プロフィール・目標カロリー設定フォーム |
| `app/onboarding/page.tsx` | 初回登録後の体型入力フォーム |

### API ルート（サーバーサイドのみで実行）

| エンドポイント | やること |
|---|---|
| `POST /api/analyze-meal` | 画像（Base64）を GPT-4o に送ってカロリーを返す |
| `POST /api/coach` | Claude API にメッセージを送り返答を返す（Premium チェックあり） |
| `GET /api/stripe/checkout` | Stripe の決済リンクを生成してリダイレクト |
| `POST /api/stripe/webhook` | Stripe からの課金イベントを受け取り plan を更新 |

### ミドルウェア（全リクエストに適用）

`middleware.ts` がすべてのアクセスを検査する：
- 未ログインで保護ルートにアクセス → `/login` へリダイレクト
- ログイン済みで認証ページにアクセス → `/dashboard` へリダイレクト

---

## データフロー

### 食事記録（写真）

```
ユーザーが写真を選択
    ↓
PhotoUpload.tsx（ブラウザ内で Base64 変換）
    ↓
POST /api/analyze-meal（サーバー）
    ↓
OpenAI GPT-4o Vision API
    ↓
{ calories: 580, note: "親子丼" } を返す
    ↓
PhotoUpload.tsx に結果表示
    ↓
ユーザーが「記録する」を押す
    ↓
meal_logs テーブルに INSERT
```

### AIコーチチャット

```
ユーザーがメッセージを入力
    ↓
coach/page.tsx（楽観的UI：即座にメッセージ表示）
    ↓
POST /api/coach（サーバー）
    ├── Premium チェック（free なら 403）
    ├── 直近7日の食事・体重・会話履歴を Supabase から取得
    ├── ユーザーメッセージを coach_messages に保存
    ├── Claude API 呼び出し（システムプロンプト＋コンテキスト注入）
    └── アシスタント返答を coach_messages に保存
    ↓
{ message: "昨日より少ないです！夕食600kcal以内を目標に💪" } を返す
    ↓
coach/page.tsx に返答を表示
```

### 課金フロー

```
ユーザーが「月額980円で始める」を押す
    ↓
GET /api/stripe/checkout
    ↓
Stripe Checkout セッション生成（metadata に user_id を埋め込む）
    ↓
Stripe の決済ページへリダイレクト
    ↓
決済完了
    ↓
POST /api/stripe/webhook（Stripe → サーバー）
    ↓
checkout.session.completed イベントを検証
    ↓
users テーブルの plan を 'premium' に更新
```

### 日付ナビゲーション

```
DateNavigator の ‹ › ボタン
    ↓
router.push('/dashboard?date=YYYY-MM-DD')
    ↓
URL が変わる（クライアントナビゲーション）
    ↓
dashboard/page.tsx（サーバー）が searchParams.date を受け取る
    ↓
その日付の meal_logs を Supabase から取得してレンダリング
```

---

## サーバー vs クライアント Supabase クライアントの使い分け

| | `lib/supabase/client.ts` | `lib/supabase/server.ts` |
|---|---|---|
| 使う場所 | `'use client'` なコンポーネント・ページ | サーバーコンポーネント・API ルート |
| Cookie 管理 | ブラウザが自動で管理 | Next.js の Cookie を手動で読み書き |
| 使う理由 | クライアントサイドの認証状態維持 | SSR 時のセッション取得・セキュアな処理 |
