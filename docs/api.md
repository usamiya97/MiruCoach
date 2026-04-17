# API 仕様

すべての API ルートは `src/app/api/` に配置されている。
Next.js App Router の Route Handler（`route.ts`）として実装。

---

## POST /api/analyze-meal

食事の写真を GPT-4o Vision で解析してカロリーを返す。

### 認証

必須（未認証は 401）

### リクエスト

```json
{
  "imageBase64": "iVBORw0KGgo...",
  "mimeType": "image/jpeg"
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `imageBase64` | string | 画像の Base64 エンコード文字列 |
| `mimeType` | string | 画像の MIME タイプ（`image/jpeg` など） |

### レスポンス（200）

```json
{
  "calories": 580,
  "note": "親子丼（ご飯280kcal、鶏卵・鶏肉300kcal）"
}
```

### エラー

| ステータス | 理由 |
|---|---|
| 401 | 未認証 |
| 500 | GPT-4o の解析失敗・JSON パース失敗 |

### 処理の流れ

```
リクエスト受信
    ↓
Supabase で認証確認
    ↓
OpenAI GPT-4o に画像（data URL 形式）とプロンプトを送信
    ↓
レスポンスから JSON を正規表現で抽出（{ } 部分を取り出す）
    ↓
{ calories, note } を返す
```

---

## POST /api/coach

AIコーチ（Claude）にメッセージを送り、返答を返す。Premium 専用。

### 認証

必須（未認証は 401）

### プラン制限

Premium のみ（Free は 403）

### リクエスト

```json
{
  "message": "最近食べすぎてしまっています..."
}
```

### レスポンス（200）

```json
{
  "message": "昨日より300kcal少ないです！夕食は600kcal以内を目標にしてみましょう💪"
}
```

### エラー

| ステータス | 理由 |
|---|---|
| 401 | 未認証 |
| 403 | Free プラン |
| 500 | Claude API エラー |

### 処理の流れ

```
リクエスト受信
    ↓
Supabase で認証・プラン確認
    ↓
Promise.all で並列取得：
  ├── 直近7日の meal_logs（日別カロリー集計用）
  ├── 直近7日の body_logs
  └── 直近20件の coach_messages（会話履歴）
    ↓
システムプロンプトにユーザーデータを注入
    ↓
ユーザーメッセージを coach_messages に INSERT
    ↓
Claude API 呼び出し（max_tokens: 300）
    ↓
アシスタント返答を coach_messages に INSERT
    ↓
{ message } を返す
```

### システムプロンプトに含まれるデータ

- コーチ名・トーン（`coach_name`, `coach_tone`）
- 直近7日の日別カロリー合計
- 直近7日の体重記録
- 直近20件の会話履歴（Claude のメッセージ配列として渡す）

---

## GET /api/stripe/checkout

Stripe の決済ページへのリダイレクト URL を生成する。

### 認証

必須（未認証は /login へリダイレクト）

### レスポンス

Stripe Checkout ページへ 303 リダイレクト。

### 処理の流れ

```
リクエスト受信
    ↓
Supabase で認証確認
    ↓
Stripe Checkout セッション作成：
  - mode: 'subscription'
  - price: 月額 980 円のプライス ID
  - metadata: { user_id } を埋め込む（webhook で使う）
  - success_url / cancel_url を設定
    ↓
Stripe の決済ページへリダイレクト
```

---

## POST /api/stripe/webhook

Stripe からの課金イベントを受け取り、ユーザーのプランを更新する。

### 認証

Stripe の署名検証（`stripe-signature` ヘッダー）。署名が不正なら 400。

### 処理するイベント

#### `checkout.session.completed`（決済完了）

```
metadata.user_id で users を特定
    ↓
plan = 'premium'
stripe_customer_id = セッションの customer ID
に更新
```

#### `customer.subscription.deleted`（サブスク解約）

```
stripe_customer_id で users を特定
    ↓
plan = 'free' に更新
```

### 注意点

Webhook は Supabase の RLS をバイパスする必要があるため、
`SUPABASE_SERVICE_ROLE_KEY` を使った Admin クライアントを使用している。
（通常の anon クライアントでは RLS により他ユーザーのレコードを更新できない）

---

## 共通の設計方針

- すべての API ルートは `try-catch` でエラーハンドリングする
- 認証チェックは最初に行う
- 環境変数は `.env.local` で管理し、コードにハードコードしない
- エラーログは `console.error` で出力（Vercel のログから確認可能）
