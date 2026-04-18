import { Leaf } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#faf7f5]">
      <div className="max-w-xl lg:max-w-3xl mx-auto min-h-screen flex flex-col">

        {/* グラデーションヘッダー */}
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-rose-400 to-pink-300 px-6 pt-16 pb-24 flex-shrink-0">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
          <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/10 rounded-full translate-y-6 -translate-x-6" />

          {/* ロゴ */}
          <div className="relative flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center">
              <Leaf size={30} className="text-rose-400" strokeWidth={1.8} />
            </div>
            <div className="text-center">
              <h1 className="text-white text-xl font-bold">ミルコーチ</h1>
              <p className="text-white/70 text-xs mt-0.5">あなた専属のダイエットコーチ</p>
            </div>
          </div>
        </div>

        {/* フォームカード（ヘッダーに少し重なる） */}
        <div className="px-4 -mt-10 relative z-10 pb-10">
          {children}
        </div>

      </div>
    </div>
  )
}
