# アーキテクチャ図解

---

## 1. システム全体図

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ブラウザ（ユーザー）                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTP リクエスト
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Vercel（ホスティング）                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   Next.js 14（App Router）                    │  │
│  │                                                              │  │
│  │  ┌──────────────┐   ┌──────────────────────────────────┐   │  │
│  │  │ middleware.ts │   │           Pages（UI）             │   │  │
│  │  │              │   │                                  │   │  │
│  │  │ ルートガード  │   │  /             ランディング        │   │  │
│  │  │              │   │  /login        ログイン           │   │  │
│  │  │ 未認証 →     │   │  /signup       新規登録           │   │  │
│  │  │ /login       │   │  /onboarding   初期設定           │   │  │
│  │  │              │   │  /dashboard    ホーム             │   │  │
│  │  │ 認証済み →   │   │  /meal         食事記録           │   │  │
│  │  │ /dashboard   │   │  /coach        AIコーチ           │   │  │
│  │  └──────────────┘   │  /settings     設定               │   │  │
│  │                     └──────────────────────────────────┘   │  │
│  │                                                              │  │
│  │                     ┌──────────────────────────────────┐   │  │
│  │                     │         API Routes               │   │  │
│  │                     │                                  │   │  │
│  │                     │  /api/analyze-meal  画像解析      │   │  │
│  │                     │  /api/coach         AI会話        │   │  │
│  │                     │  /api/stripe/checkout  決済      │   │  │
│  │                     │  /api/stripe/webhook   課金反映  │   │  │
│  │                     └──────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────┬─────────────────────┬───────────────────┬───────────────────┘
        │                     │                   │
        ▼                     ▼                   ▼
┌───────────────┐   ┌──────────────────┐   ┌───────────────┐
│   Supabase    │   │   OpenAI API     │   │   Stripe      │
│               │   │                  │   │               │
│  PostgreSQL   │   │  GPT-4o Vision   │   │  決済処理     │
│  Auth         │   │  （画像解析）     │   │  サブスク管理  │
│  Storage      │   └──────────────────┘   └───────────────┘
└───────────────┘
        │
        ▼
┌───────────────┐
│ Anthropic API │
│               │
│  Claude API   │
│  （AIコーチ）  │
└───────────────┘
```

---

## 2. ページ遷移図

```
                        ┌──────────────┐
                        │      /       │
                        │  LP ページ   │
                        └──────┬───────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                                 ▼
      ┌───────────────┐               ┌──────────────────┐
      │   /signup     │               │    /login        │
      │   新規登録    │               │    ログイン       │
      └───────┬───────┘               └────────┬─────────┘
              │ 認証成功                        │ 認証成功
              ▼                                 │
      ┌───────────────┐                        │
      │ /onboarding   │                        │
      │ 身長・体重入力 │                        │
      └───────┬───────┘                        │
              │ 設定完了 or スキップ             │
              └──────────────┬─────────────────┘
                             ▼
              ┌──────────────────────────────────┐
              │           /dashboard             │
              │  カロリーリング / 食事一覧 / グラフ │
              └──────┬─────────┬────────┬────────┘
                     │         │        │
           ┌─────────┘   ┌─────┘   ┌───┘
           ▼             ▼         ▼
      ┌─────────┐  ┌──────────┐  ┌──────────┐
      │  /meal  │  │  /coach  │  │/settings │
      │ 食事記録 │  │AIコーチ  │  │ 設定      │
      └─────────┘  └──────────┘  └──────────┘
                        │
                  Free プラン
                        │
                        ▼
                  ┌──────────────────┐
                  │ /api/stripe/     │
                  │ checkout         │
                  │ （Stripe 決済へ） │
                  └──────────────────┘
```

---

## 3. レイアウト構造（入れ子）

```
app/layout.tsx（最外殻）
│   <html> <body>
│   全ページ共通
│
├── (auth)/layout.tsx
│   │   ピンクグラデーションヘッダー＋ロゴ
│   │
│   ├── login/page.tsx      → /login
│   └── signup/page.tsx     → /signup
│
└── (app)/layout.tsx
    │   BottomNav（固定フッターナビ）
    │
    ├── dashboard/page.tsx  → /dashboard
    ├── meal/page.tsx       → /meal
    ├── coach/page.tsx      → /coach
    └── settings/page.tsx   → /settings
```

---

## 4. コンポーネント構成図

```
/dashboard（サーバーコンポーネント）
│
├── CalorieRing           消費カロリーの円グラフ（SVG）
│
├── DateNavigator         日付ナビ（‹ 4月15日 ›）
│   └── router.push('/dashboard?date=...')
│
├── MealCard × n          食事1件の表示（削除なし）
│
├── WeightChart           体重推移グラフ（recharts）
│   ├── データ0件 → 空メッセージ
│   ├── データ1件 → 数字を大きく表示
│   └── データ2件以上 → 折れ線グラフ
│
└── コーチ CTA バナー     → /coach へのリンク

/meal（クライアントコンポーネント）
│
├── Tab: 📷 写真
│   └── PhotoUpload
│       ├── Step1: 写真選択エリア（点線）
│       ├── Step2: プレビュー ＋ 解析ボタン
│       └── Step3: カロリー結果 ＋ 記録ボタン
│
├── Tab: ✏️ 手入力
│   └── 食事タイプ選択 ＋ カロリー入力フォーム
│
├── Tab: ⚖️ 体重
│   └── 体重入力フォーム
│
└── 今日の記録一覧
    └── MealCard × n（削除ボタンあり）
        ├── 通常: [✕] ボタン
        └── confirming: [キャンセル] [削除する]

/coach（クライアントコンポーネント）
│
├── Free プラン → ペイウォール表示
│
└── Premium プラン
    ├── チャットヘッダー（コーチ名）
    ├── ChatMessage × n（左右交互）
    │   ├── user    → 右揃え・ローズ背景
    │   └── assistant → 左揃え・白背景＋アイコン
    └── ChatInput（入力欄＋送信ボタン）
```

---

## 5. 食事記録フロー（写真）

```
ユーザーが写真を選択
        │
        ▼
PhotoUpload.tsx
FileReader.readAsDataURL(file)
        │
        │ Base64 変換完了
        ▼
プレビュー表示

ユーザーが「解析する」を押す
        │
        ▼
POST /api/analyze-meal
{ imageBase64, mimeType }
        │
        ▼
OpenAI GPT-4o Vision
"この食事のカロリーを JSON で返して"
        │
        ▼
{ "calories": 580, "note": "親子丼" }
        │
        ▼
PhotoUpload.tsx に結果表示

ユーザーが「記録する」を押す
        │
        ▼
supabase.from('meal_logs').insert({
  calories: 580,
  note: "親子丼",
  meal_type: "lunch",
  ...
})
        │
        ▼
今日の食事一覧を再取得して表示
```

---

## 6. AIコーチフロー

```
ユーザーがメッセージ入力
        │
        ▼
ChatInput.tsx
onSend(text) を呼ぶ
        │
        ▼
coach/page.tsx
楽観的UI: メッセージを即座に画面に追加
        │
        ▼
POST /api/coach
{ message: "最近食べすぎています" }
        │
        ├── 認証チェック（401 なら弾く）
        ├── プランチェック（Free なら 403 で弾く）
        │
        ▼
Promise.all（並列取得）
        ├── meal_logs（直近7日）→ 日別カロリー集計
        ├── body_logs（直近7日）→ 体重推移
        └── coach_messages（直近20件）→ 会話履歴
        │
        ▼
システムプロンプト生成
"あなたはミルというコーチです。
 直近7日の食事: 4/14: 1850kcal...
 体重: 4/14: 57.2kg..."
        │
        ▼
claude_messages に INSERT（user）
        │
        ▼
Claude API（claude-sonnet）
max_tokens: 300
        │
        ▼
"昨日より少ないです！夕食600kcal以内を目標に💪"
        │
        ▼
coach_messages に INSERT（assistant）
        │
        ▼
{ message } をブラウザに返す
        │
        ▼
coach/page.tsx
画面にアシスタントメッセージを追加
```

---

## 7. 課金フロー

```
ユーザーが「月額980円で始める」を押す
        │
        ▼
GET /api/stripe/checkout
        │
        ▼
Stripe Checkout セッション作成
metadata: { user_id: "xxx" }
        │
        ▼
Stripe の決済ページへリダイレクト（303）
        │
        ▼
ユーザーがカード情報を入力・決済完了
        │
        ▼
Stripe → POST /api/stripe/webhook
event: "checkout.session.completed"
        │
        ├── 署名検証（stripe-signature ヘッダー）
        ├── metadata.user_id を取得
        │
        ▼
Supabase Admin クライアント（RLS バイパス）
users.plan = 'premium'
users.stripe_customer_id = "cus_xxx"
        │
        ▼
ユーザーが /coach にアクセスすると
premium チェックをパスして AI コーチが使える


--- 解約時 ---

ユーザーが Stripe でサブスク解約
        │
        ▼
Stripe → POST /api/stripe/webhook
event: "customer.subscription.deleted"
        │
        ▼
stripe_customer_id で users を特定
users.plan = 'free'
        │
        ▼
次回 /coach アクセス時にペイウォールが表示される
```

---

## 8. 目標カロリー計算ロジック

```
入力値：身長・体重・目標体重・年齢
        │
        ▼
BMR（基礎代謝）= Mifflin-St Jeor 式（女性）
10 × 体重 + 6.25 × 身長 - 5 × 年齢 - 161
        │
        ▼
TDEE（総消費カロリー）
= BMR × 1.375（デスクワーク中心の活動係数）
        │
        ▼
減量幅に応じた削減量（deficit）
体重 - 目標体重 <= 0kg → deficit 0   （維持・増量）
体重 - 目標体重  < 5kg → deficit 300
体重 - 目標体重  < 10kg → deficit 400
体重 - 目標体重 >= 10kg → deficit 500
        │
        ▼
目標カロリー = max(TDEE - deficit, 1200)
※ 最低 1200kcal を保証（極端な制限を防ぐ）
```

---

## 9. ミドルウェアの動き

```
全リクエスト（静的ファイル以外）
        │
        ▼
middleware.ts
Supabase で getUser()（Cookie からセッション取得）
        │
        ├─ 保護ルート かつ user なし
        │       → /login へリダイレクト
        │
        ├─ 認証ルート かつ user あり
        │       → /dashboard へリダイレクト
        │
        └─ それ以外
                → そのまま通す（supabaseResponse）

保護ルート: /dashboard /meal /coach /onboarding /settings
認証ルート: /login /signup
```
