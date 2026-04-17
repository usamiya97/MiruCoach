# 認証フロー

Supabase Auth の **OTP（ワンタイムパスワード）** を使用。パスワード不要でメールだけで認証する。

---

## 新規登録フロー

```
① ユーザーが /signup にアクセス
        ↓
② メールアドレスを入力して送信
   supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
        ↓
③ Supabase がメールに 8 桁の確認コードを送信
        ↓
④ ユーザーが確認コードを入力
   supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
        ↓
⑤ 認証成功 → Supabase が auth.users にユーザーを作成
             → トリガーが発火して public.users レコードも自動作成
        ↓
⑥ /onboarding へリダイレクト
        ↓
⑦ 身長・年齢・体重・目標体重を入力
   → 目標カロリー自動計算（Mifflin-St Jeor 式）
   → users テーブルに upsert
   → body_logs に初回体重を INSERT
        ↓
⑧ /dashboard へリダイレクト（利用開始）
```

---

## ログインフロー

```
① ユーザーが /login にアクセス
        ↓
② メールアドレスを入力して送信
   supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
   ※ shouldCreateUser: false → 未登録メールはエラーになる
        ↓
③ Supabase がメールに 8 桁の確認コードを送信
        ↓
④ ユーザーが確認コードを入力
   supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
        ↓
⑤ 認証成功 → /dashboard へリダイレクト
```

---

## ルート保護の仕組み（middleware.ts）

`middleware.ts` が **すべてのリクエストで実行される**。

```
リクエスト発生
    ↓
middleware.ts が Supabase でセッションを確認
    ↓
┌─ 保護ルートかつ未ログイン → /login へリダイレクト
├─ 認証ルートかつログイン済み → /dashboard へリダイレクト
└─ それ以外 → そのまま通す
```

### 保護ルート（ログイン必須）

```
/dashboard
/meal
/coach
/onboarding
/settings
```

### 認証ルート（ログイン済みはアクセス不可）

```
/login
/signup
```

---

## オンボーディングのスキップ防止

`onboarding/page.tsx` は `useEffect` で「すでに height が設定済みか」を確認する。

```
/onboarding にアクセス
    ↓
users.height が設定済み？
    ├─ YES → /dashboard へリダイレクト（再オンボーディング防止）
    └─ NO  → オンボーディングフォームを表示
```

---

## セッション管理

- セッション情報は **ブラウザの Cookie** に保存される
- Supabase SSR ライブラリが Cookie の読み書きを自動で行う
- サーバーコンポーネント・API ルートでは `lib/supabase/server.ts` を使い、Cookie からセッションを復元する
- クライアントコンポーネントでは `lib/supabase/client.ts` を使う

### なぜ getSession ではなく getUser を使うのか

```ts
// 安全（サーバーに問い合わせて検証）
const { data: { user } } = await supabase.auth.getUser()

// 危険（Cookie の内容を信頼するだけで検証しない）
const { data: { session } } = await supabase.auth.getSession()
```

middleware.ts やサーバーコンポーネントでは必ず `getUser()` を使用している。
