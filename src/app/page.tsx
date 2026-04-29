import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Camera, Sparkles, TrendingUp, type LucideIcon } from 'lucide-react'

// ── 小コンポーネント ──────────────────────────────────

function FeatureCard({ icon: Icon, title, description }: {
  icon: LucideIcon; title: string; description: string
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mb-4">
        <Icon size={24} className="text-rose-500" strokeWidth={1.8} />
      </div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  )
}

function Step({ number, title, description }: {
  number: string; title: string; description: string
}) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-10 h-10 bg-linear-to-br from-rose-500 to-pink-400 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm shadow-rose-200">
        {number}
      </div>
      <div className="pt-1.5">
        <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function PhoneMockup() {
  return (
    <div className="w-56 bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-[6px] border-white/60 rotate-2">
      {/* アプリヘッダー */}
      <div className="bg-linear-to-br from-rose-500 to-pink-400 px-4 pt-5 pb-10">
        <p className="text-white/70 text-[10px]">おはようございます 🌅</p>
        <p className="text-white font-bold text-xs mt-0.5">今日も一緒に頑張ろう</p>
        {/* ミニカロリーリング */}
        <div className="flex justify-center mt-3">
          <div className="relative w-20 h-20">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="12" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="white" strokeWidth="12"
                strokeDasharray="238.8" strokeDashoffset="95" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white font-bold text-base leading-none">1,240</span>
              <span className="text-white/60 text-[9px]">kcal</span>
            </div>
          </div>
        </div>
      </div>
      {/* アプリコンテンツ */}
      <div className="bg-[#faf7f5] -mt-5 p-3 space-y-2">
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <p className="text-[10px] font-bold text-gray-600 mb-1.5">今日の食事</p>
          {[
            { label: '朝食', food: 'トースト・サラダ', kcal: '380' },
            { label: '昼食', food: '親子丼',           kcal: '560' },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-2 py-1 border-b border-gray-50 last:border-0">
              <div className="w-6 h-6 bg-rose-50 rounded-md flex items-center justify-center text-xs">🍽️</div>
              <div className="flex-1">
                <p className="text-[9px] text-rose-400 font-medium">{m.label}</p>
                <p className="text-[9px] text-gray-700">{m.food}</p>
              </div>
              <span className="text-[9px] font-bold text-gray-600">{m.kcal}</span>
            </div>
          ))}
        </div>
        <div className="bg-rose-500 rounded-xl p-2.5 flex items-start gap-2">
          <span className="text-base shrink-0">🌿</span>
          <p className="text-white text-[9px] leading-relaxed">
            昨日より300kcal少ないです！<br />夕食は600kcal以内を目標に 💪
          </p>
        </div>
      </div>
    </div>
  )
}

// ── メインページ ──────────────────────────────────────

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-white">

      {/* ── ナビゲーション ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100/80">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="mirucoach" className="w-12 h-12 object-contain" />
            <span className="font-black text-gray-900 text-lg tracking-tight">
              miru<span className="text-rose-500">coach</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login"
              className="hidden sm:block text-sm text-gray-500 hover:text-gray-900 transition-colors px-3 py-2">
              ログイン
            </Link>
            <Link href="/signup"
              className="text-xs sm:text-sm bg-linear-to-r from-rose-500 to-pink-400 text-white px-4 sm:px-5 py-2 rounded-full font-medium hover:opacity-90 transition-all shadow-sm shadow-rose-200 whitespace-nowrap">
              無料で始める
            </Link>
          </div>
        </div>
      </nav>

      {/* ── ヒーロー ── */}
      <section className="relative overflow-hidden bg-linear-to-br from-rose-500 via-rose-400 to-pink-300 pt-36 pb-28">
        <div className="absolute top-0 right-0 w-125 h-125 bg-white/10 rounded-full -translate-y-40 translate-x-40" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full translate-y-24 -translate-x-24" />

        <div className="relative max-w-5xl mx-auto px-6 flex items-center gap-16">
          {/* テキスト */}
          <div className="flex-1">
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs px-4 py-1.5 rounded-full mb-6 font-medium border border-white/20">
              AIパーソナルコーチ × カロリー管理
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
              我慢じゃなく、<br />仕組みで痩せる
            </h1>
            <p className="text-white/80 text-lg leading-relaxed mb-10">
              写真1枚でカロリーを自動記録。<br />
              AIコーチが毎日データを分析してサポート。<br />
              忙しい毎日でも続けられるダイエット。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup"
                className="bg-white text-rose-500 px-8 py-3.5 rounded-full font-bold hover:shadow-xl transition-all text-sm">
                無料で始める →
              </Link>
              <Link href="/login"
                className="bg-white/20 backdrop-blur-sm text-white px-8 py-3.5 rounded-full font-medium hover:bg-white/30 transition-all border border-white/30 text-sm">
                ログイン
              </Link>
            </div>
            <p className="text-white/50 text-xs mt-4">クレジットカード不要・登録1分</p>
          </div>

          {/* フォンモックアップ */}
          <div className="hidden lg:flex shrink-0 items-center justify-center pr-8">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ── スタッツ ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-3 divide-x divide-gray-100">
          {[
            { value: '写真1枚',  label: 'でカロリー自動記録' },
            { value: '3文以内',  label: 'のコーチからのメッセージ' },
            { value: '¥980 / 月', label: 'でAIコーチが使い放題' },
          ].map((s) => (
            <div key={s.label} className="text-center px-8">
              <p className="text-2xl font-bold text-rose-500">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 特徴 ── */}
      <section className="bg-[#faf7f5] py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-rose-400 text-xs font-bold tracking-[0.2em] uppercase">Features</span>
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mt-2">
              続けられる理由が、ここにある
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <FeatureCard
              icon={Camera}
              title="写真1枚でカロリー記録"
              description="食事を撮るだけでAI（GPT-4o）が自動解析。カロリーと内訳を瞬時に記録。手入力にも対応。"
            />
            <FeatureCard
              icon={Sparkles}
              title="AIコーチとの毎日の会話"
              description="食事・体重データをもとに専属コーチが返答。サボった日も責めず、具体的なアドバイスを届けます。"
            />
            <FeatureCard
              icon={TrendingUp}
              title="体重推移をグラフで可視化"
              description="30日間の体重変化をグラフで確認。過去の食事記録も日付をさかのぼって見返せます。"
            />
          </div>
        </div>
      </section>

      {/* ── 使い方 ── */}
      <section className="bg-white py-24">
        <div className="max-w-5xl mx-auto px-6 flex flex-col lg:flex-row gap-16 items-center">
          <div className="flex-1">
            <span className="text-rose-400 text-xs font-bold tracking-[0.2em] uppercase">How it works</span>
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mt-2 mb-10">
              使い方はシンプル
            </h2>
            <div className="space-y-8">
              <Step number="1" title="メールアドレスで登録（1分）"
                description="パスワード不要。メールに届く確認コードだけで登録完了。" />
              <Step number="2" title="身長・体重・目標を入力"
                description="あなたに合った目標カロリーを自動計算。後からいつでも変更できます。" />
              <Step number="3" title="毎日の食事を写真で記録"
                description="撮るだけでカロリーが記録されます。体重記録もワンタップで簡単。" />
              <Step number="4" title="AIコーチに話しかける（Premium）"
                description="データに基づいた具体的なアドバイスが届きます。サボった日も優しく寄り添います。" />
            </div>
          </div>
          <div className="shrink-0 flex justify-center lg:justify-end">
            <div className="-rotate-2">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── 料金 ── */}
      <section className="bg-[#faf7f5] py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-rose-400 text-xs font-bold tracking-[0.2em] uppercase">Pricing</span>
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mt-2">
              シンプルな料金プラン
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">

            {/* Free */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 flex flex-col">
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-400 tracking-widest mb-2">FREE</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-gray-900">¥0</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">ずっと無料</p>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 flex-1 mb-8">
                {['写真でカロリー自動記録', '手入力でカロリー記録', '体重記録・グラフ表示',
                  '目標カロリー設定', '過去の記録をさかのぼる'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <span className="w-4 h-4 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center text-[10px] shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup"
                className="block text-center py-3 border-2 border-rose-300 text-rose-500 rounded-xl text-sm font-bold hover:bg-rose-50 transition-colors">
                無料で始める
              </Link>
            </div>

            {/* Premium */}
            <div className="relative overflow-hidden bg-linear-to-br from-rose-500 to-pink-400 rounded-2xl p-8 flex flex-col">
              <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
              <div className="relative flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-bold text-white/70 tracking-widest">PREMIUM</p>
                  <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full">おすすめ</span>
                </div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-white">¥980</span>
                  <span className="text-white/60 text-sm mb-1">/ 月</span>
                </div>
                <p className="text-white/50 text-xs mb-6">いつでもキャンセル可能</p>
                <ul className="space-y-3 text-sm text-white/90 mb-8">
                  {['FREEの全機能', 'AIコーチとの毎日の会話', '食事・体重データを踏まえた提案',
                    'サボった日も責めないコーチング', 'コーチの名前・トーン設定'].map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <span className="w-4 h-4 bg-white/20 text-white rounded-full flex items-center justify-center text-[10px] shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup"
                  className="block text-center py-3 bg-white text-rose-500 rounded-xl text-sm font-bold hover:shadow-lg transition-all">
                  Premium を試す
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 最終 CTA ── */}
      <section className="relative overflow-hidden bg-linear-to-br from-rose-500 via-rose-400 to-pink-300 py-24">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-12 -translate-x-12" />
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            今日から、始めてみませんか
          </h2>
          <p className="text-white/70 mb-10 text-lg">
            写真を撮るだけ。それだけで変わり始めます。
          </p>
          <Link href="/signup"
            className="inline-block bg-white text-rose-500 px-12 py-4 rounded-full font-bold text-base hover:shadow-2xl transition-all">
            無料で始める →
          </Link>
          <p className="text-white/40 text-xs mt-4">クレジットカード不要・登録1分</p>
        </div>
      </section>

      {/* ── フッター ── */}
      <footer className="bg-gray-900 py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="mirucoach" className="w-8 h-8 rounded-lg" />
            <span className="font-black text-white text-base tracking-tight">
              miru<span className="text-rose-400">coach</span>
            </span>
          </div>
          <div className="flex gap-6 text-xs text-gray-500">
            <a href="#" className="hover:text-gray-300 transition-colors">利用規約</a>
            <a href="#" className="hover:text-gray-300 transition-colors">プライバシーポリシー</a>
            <a href="#" className="hover:text-gray-300 transition-colors">お問い合わせ</a>
          </div>
          <p className="text-xs text-gray-600">© 2026 ミルコーチ</p>
        </div>
      </footer>

    </div>
  )
}
