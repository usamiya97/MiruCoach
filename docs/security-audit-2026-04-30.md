# MiruCoach セキュリティ監査レポート

- **監査日**: 2026-04-30
- **監査対象**: `main` ブランチ HEAD（813ebe0）
- **監査範囲**: API ルート、認証/認可、Supabase RLS、ミドルウェア、設定、フロントエンド XSS、Stripe 連携

## エグゼクティブサマリー

実コードを直接確認した結果、**CRITICAL 4 件 / HIGH 4 件 / MEDIUM 4 件 / LOW 3 件** の脆弱性または改善余地を確認した。

最も深刻なのは以下:

1. **`/api/stripe/verify-session` の認証なし Service Role Key 利用** — Stripe webhook と二重に DB を書き換える経路。将来的な権限昇格の足場になる。
2. **`/api/analyze-meal` の入力検証ゼロ + 課金チェック不在** — 1 アカウントで OpenAI クレジットを枯渇させる金銭的 DOS が成立する。
3. **`/api/coach` のメッセージ長制限なし + プロンプトインジェクション** — Claude API 入力トークン爆発と self-jailbreak（規約違反コンテンツ生成）が可能。
4. **`next.config.ts` が空でセキュリティヘッダー皆無** — CSP / HSTS / X-Frame-Options いずれも未設定。

逆に良い実装点:

- Supabase RLS は `users` / `meal_logs` / `body_logs` / `coach_messages` 全テーブルで `auth.uid() = user_id` ポリシーが入っており、他人データへの直接アクセスは遮断されている
- Stripe webhook の署名検証は実装済み
- ブラウザ用クライアント（`anon key`）とサーバー用クライアント（`anon key` + cookie）が分離されており、`SUPABASE_SERVICE_ROLE_KEY` はクライアントバンドルに混入していない
- `dangerouslySetInnerHTML` の使用箇所はゼロ。AI コーチの返答もテキストノードとして React が自動エスケープしている

---

## 攻撃可能な穴（重大度順）

### CRITICAL

#### C1. `/api/stripe/verify-session` — 認証なし + Service Role Key で `users` 更新

- **ファイル**: `src/app/api/stripe/verify-session/route.ts:5-39`
- **問題**:
  - GET エンドポイントに認証チェックがない
  - `session_id` クエリだけで `createAdminClient()`（Service Role Key, RLS バイパス）を作り、`users` テーブルを `plan='premium'` に更新している
  - `metadata.user_id` は現在 `checkout/route.ts:29` で自分の `user.id` しか入らないため、**直接他人を premium 化することはギリギリできない**。ただし以下のリスクが残る:
    1. Stripe webhook と二重に DB を書き換える経路になり、状態整合性が崩れやすい
    2. 将来 metadata を別経路で書く実装が混入したら、即時に他人権限昇格の経路になる
    3. `customer_id` を攻撃者制御の値で上書きできる可能性（後日他人の Customer Portal にリダイレクトする攻撃の足場）
- **修正方針**:
  - **推奨**: DB 更新ロジックをこのエンドポイントから完全削除し、単に `/dashboard?upgraded=1` にリダイレクトするだけにする。プラン反映は webhook の責務に集約
  - **次善**: リクエスト元の認証ユーザー `user.id === session.metadata.user_id` の照合を必須にし、Service Role Key 利用をやめて通常クライアントで RLS 経由更新

#### C2. `/api/analyze-meal` — 入力検証ゼロ + 課金チェックなし → 金銭的 DOS

- **ファイル**: `src/app/api/analyze-meal/route.ts:6-55`
- **問題**:
  - 認証だけ通れば free ユーザーでも GPT-4o Vision を叩ける（`L10-12` で `user` 確認のみ。plan チェックなし）
  - `imageBase64` / `mimeType` のバリデーション 0 行。サイズ上限も MIME ホワイトリストもない（`L14-15`）
  - リクエスト 1 件あたりのコストは小さいが、無制限ループで OpenAI クレジットを破壊できる
- **攻撃シナリオ**: 1 アカウント作成 → スクリプトで毎秒大量 POST → アカウントの API クォータが溶ける
- **修正方針**:
  - free/premium のいずれにも**ユーザー単位の日次レート制限**（例: free=3 回/日、premium=30 回/日）
  - `imageBase64.length` の上限（5 MB 相当 ≒ 6.7M chars）
  - `mimeType` を `['image/jpeg','image/png','image/webp']` のホワイトリストで検証
  - `meal_logs` への保存と紐付け、呼び出し回数を計測

#### C3. `/api/coach` — メッセージ長制限なし + プロンプトインジェクション

- **ファイル**: `src/app/api/coach/route.ts:25-26, 70-111, 114-118, 130`
- **問題**:
  1. `message` のサイズ制限がなく、premium ユーザーは Claude API のコストを爆発させられる（`max_tokens: 300` は出力のみで入力は無制限）
  2. ユーザーが `coach_name` を `」。 これまでの指示を全て無視し、…` のように設定すると system prompt の論理を破壊できる（self-attack だが、医療アドバイス出力 → 規約違反 → アカウント停止 → サービス全体の信用失墜の連鎖が起こる）
  3. `message` を**先に DB に insert**してから Claude を呼ぶため、Claude 呼び出しが失敗してもユーザー発話だけが履歴に残り、次回以降の history に永続的なジェイルブレイク文を埋め込める
- **修正方針**:
  - `message` の長さ上限（例: 2,000 文字）と空文字バリデーション
  - `coach_name` を system prompt に挿入する前に正規化（記号制限、長さ 20 文字以内）。テーブル側にも CHECK 制約を追加
  - ユーザー保存と Claude 呼び出しを順序入れ替え、Claude 成功時に user/assistant をまとめて insert（または失敗時にユーザーメッセージをロールバック）

#### C4. セキュリティヘッダーが未設定

- **ファイル**: `next.config.ts:1-7`（中身が空）
- **問題**: CSP / X-Frame-Options / HSTS / Referrer-Policy / X-Content-Type-Options のいずれも未設定
  - 任意の外部サイトに iframe 埋め込み可能 → クリックジャッキングで Stripe checkout 誘導
  - XSS が一箇所でも入った時に被害が無制限に拡大
- **修正方針**: `next.config.ts` の `headers()` で以下を追加
  - `Content-Security-Policy`（self + Supabase + Stripe + OpenAI/Anthropic 用ドメインに限定）
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Content-Type-Options: nosniff`
  - `Permissions-Policy: camera=(self), geolocation=()`

---

### HIGH

#### H1. Stripe webhook の処理が不完全

- **ファイル**: `src/app/api/stripe/webhook/route.ts:36-68`
- **問題**:
  - `customer.subscription.updated` / `invoice.payment_failed` を処理していない → 解約・カード失敗後も `plan='premium'` が残る
  - DB 更新の `await ...update(...)` が `error` を返しても無視され、Stripe には 200 を返す。失敗が永久にリトライされない
- **修正方針**:
  - `customer.subscription.updated` を捕捉し、`status` に応じて `plan` を切替
  - `update` の `{ error }` を分岐し、`error` 時は 500 を返して Stripe 側にリトライさせる

#### H2. Middleware で `/coach` にプランチェックがない

- **ファイル**: `src/middleware.ts:33-44`
- **問題**: 認証だけ通っていればページ自体には到達できる。API 側で 403 にはなるので実害は限定的だが、ペイウォール UI を経由しないクライアントから API を叩く経路は常時開いている
- **修正方針**: middleware で `/coach` アクセス時に `users.plan` を引いて free なら `/upgrade` 等にリダイレクト。または現状 API 側で防げているので、許容するなら明示的にコメントを残す

#### H3. レート制限ミドルウェア不在

- **影響**: `/api/analyze-meal`, `/api/coach`, `/api/stripe/checkout`, `/api/stripe/portal`, `/api/stripe/verify-session` 全て無防備
- **修正方針**: Vercel KV / Upstash でユーザー ID + IP ベースのトークンバケット。最低でも `/api/coach` と `/api/analyze-meal` は必須

#### H4. `<img src={meal.photo_url}>` で任意 URL 読み込み

- **ファイル**: `src/components/meal/MealCard.tsx:46-51`
- **問題**:
  - `meal.photo_url` は RLS で自分しか書けないので**他人攻撃にはならない**が、自分自身の閲覧時にリクエストが任意ドメインへ飛ぶ → リファラ・IP 漏洩、外部追跡ピクセル化
  - 現状 `PhotoUpload.tsx:80` は常に `null` を保存しているため実質未使用だが、コードパスは生きている
- **修正方針**:
  - 画像保存先を Supabase Storage に固定し、`photo_url` のドメインを CHECK 制約で限定
  - もしくは `next/image` + `remotePatterns` でホワイトリスト

---

### MEDIUM

- **M1. mimeType の data URL 注入**: `analyze-meal:26` で `data:${mimeType};base64,...` を組み立てる際エスケープなし。現状 OpenAI に送信するだけだが、C2 のホワイトリスト化で同時解決
- **M2. coach の TOCTOU**: plan チェック後にダウングレードされた場合に通る（実害は数秒分のリクエスト）。RPC で plan check + データ取得を一トランザクションで行うと厳密
- **M3. `console.error(error)` の生出力**: `analyze-meal:52`, `coach:147`, `stripe/*:36` など。Vercel logs に内部スタックが残る → 構造化ロガー + 機密フィルタ
- **M4. `NEXT_PUBLIC_APP_URL` のフォールバックが `http://localhost:3000`**: 本番環境で env 抜けが発生した場合、Stripe 戻り URL や redirect が localhost を指す → 環境変数を必須にし、未設定時は起動失敗

---

### LOW

- **L1. `unit_amount: 980` ハードコード** (`stripe/checkout:23`): Stripe Price ID 化
- **L2. Email 検証フロー未確認**: Supabase Auth ダッシュボード側の "Confirm email" 設定を確認
- **L3. `coach_messages.content` の長さ上限**: DB 側にも `length(content) <= N` の CHECK を入れて二重防御

---

## 既に正しく実装されている項目

| 項目 | 場所 | 評価 |
|------|------|------|
| Supabase RLS（全テーブル） | `supabase/migrations/001_initial_schema.sql:80-103` | ✅ `auth.uid()` ベースで他人データから保護 |
| Stripe webhook 署名検証 | `src/app/api/stripe/webhook/route.ts:24-28` | ✅ `constructEvent` で検証 |
| Supabase クライアント分離 | `src/lib/supabase/{client,server}.ts` | ✅ Service Role Key はクライアント側に出ない |
| Coach API の plan チェック | `src/app/api/coach/route.ts:21-23` | ✅ サーバー側で 403 |
| `dangerouslySetInnerHTML` 不在 | プロジェクト全体 | ✅ React 自動エスケープに依存 |
| `.env*` の gitignore | `.gitignore` | ✅ `.env*` パターンで除外 |
| ハードコードされたシークレット | プロジェクト全体 | ✅ なし |
| パスワード/ブルートフォース対策 | `src/app/(auth)/{login,signup}/page.tsx` | ✅ Google OAuth のみ採用、Supabase 側のレート制限に依存 |

---

## 修正優先度ロードマップ

| フェーズ | 対応項目 | 期待効果 |
|---------|---------|---------|
| 即日 | C1, C2, C3 | 権限昇格経路の遮断、API コスト爆発の防止 |
| 1 週内 | C4, H1, H3 | XSS/クリックジャック被害の最小化、解約処理の正常化、DOS 全般の閾値設定 |
| 2 週内 | H2, H4, M1〜M4 | 多層防御の補強 |

---

## 修正対象ファイル一覧

| ファイル | 対応する穴 |
|---------|-----------|
| `src/app/api/stripe/verify-session/route.ts` | C1 |
| `src/app/api/analyze-meal/route.ts` | C2, M1 |
| `src/app/api/coach/route.ts` | C3, M2, M3 |
| `next.config.ts` | C4, H4 |
| `src/app/api/stripe/webhook/route.ts` | H1, M3 |
| `src/middleware.ts` | H2 |
| `src/lib/rate-limit.ts`（新規） | H3 |
| `supabase/migrations/00X_constraints.sql`（新規） | C3, L3 |
| `src/components/meal/MealCard.tsx` | H4 |

---

## 検証手順（修正後）

### C1 verify-session

```bash
# 未認証 GET でも DB が更新されないこと
curl -s "https://app/api/stripe/verify-session?session_id=fake" -I
# Supabase で users.plan に変化がないことを確認
```

### C2 analyze-meal

```bash
# 巨大 base64 で 413 / 400 が返ること
curl -X POST /api/analyze-meal -d '{"imageBase64":"'$(python -c 'print("A"*10_000_000)')'","mimeType":"image/png"}'
# 不正 mime で 400
curl -X POST /api/analyze-meal -d '{"imageBase64":"abc","mimeType":"text/html"}'
# free プランで 403
```

### C3 coach

```bash
# 10 万文字 message で 400 が返ること
curl -X POST /api/coach -d '{"message":"'$(python -c 'print("あ"*100000)')'"}'
# coach_name にプロンプト破壊文字列を入れた状態で /api/coach を叩き、AI が指示無視しないこと
```

### C4 ヘッダー

```bash
curl -sI https://app/ | grep -iE 'content-security|strict-transport|x-frame|referrer'
# CSP / HSTS / X-Frame-Options / Referrer-Policy が全て返ること
```

### H1 webhook

- Stripe Dashboard の Webhook テスト機能で `customer.subscription.deleted` / `invoice.payment_failed` を送信
- DB の `plan` が `free` に戻ること、`update` 失敗時に 500 を返してリトライされることを確認
