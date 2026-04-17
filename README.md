# ミルコーチ

AIパーソナルコーチ × カロリー管理 Web アプリ。

**コンセプト：「我慢じゃなく、仕組みで痩せる」**

ターゲット：30〜40代フルタイム勤務女性

---

## 機能概要

| 機能 | プラン |
|---|---|
| 写真1枚でカロリー自動記録（GPT-4o） | Free / Premium |
| 手入力でカロリー記録 | Free / Premium |
| 体重記録・30日グラフ | Free / Premium |
| 目標カロリー自動計算（Mifflin-St Jeor 式） | Free / Premium |
| 過去の日付をさかのぼって確認 | Free / Premium |
| AIコーチとの毎日の会話（Claude API） | Premium のみ |

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 14（App Router）/ TypeScript / Tailwind CSS |
| バックエンド・DB・認証 | Supabase（PostgreSQL / Auth） |
| AIコーチ | Anthropic Claude API（claude-sonnet） |
| 画像解析 | OpenAI GPT-4o Vision |
| 決済 | Stripe（月額 980 円サブスク） |
| デプロイ | Vercel |

---

## セットアップ

### 1. リポジトリをクローン

```bash
git clone <repo-url>
cd mirucoach
npm install
```

### 2. 環境変数を設定

`.env.local` を作成して以下を記入：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

### 3. Supabase のテーブルを作成

`docs/database.md` のスキーマを Supabase の SQL Editor で実行。

### 4. 開発サーバーを起動

```bash
npm run dev
```

---

## ドキュメント

詳細な設計・仕様は `docs/` フォルダを参照：

| ドキュメント | 内容 |
|---|---|
| [アーキテクチャ図解](docs/diagram.md) | システム全体・ページ遷移・各機能のフロー図 |
| [システム全体図](docs/architecture.md) | ファイル構成・責務地図・データフロー（文章） |
| [データベース設計](docs/database.md) | テーブル定義・SQL スキーマ |
| [認証フロー](docs/auth-flow.md) | ログイン・新規登録の流れ |
| [API 仕様](docs/api.md) | 各 API ルートの仕様 |

---

## MVP 完成チェックリスト

- [x] メール認証でサインアップ・ログインできる
- [x] 写真を撮影してカロリーが自動記録される
- [x] AIコーチと会話できる（履歴が保持される）
- [x] 体重を手入力で記録できる
- [x] Stripe で月額 980 円の課金ができる
- [x] 未課金ユーザーはコーチ機能にアクセスできない
