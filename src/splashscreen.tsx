type TarotSplashScreenProps = {
  message?: string;
};

const TarotSplashScreen: React.FC<TarotSplashScreenProps> = ({ message }) => {
  // 星のランダム位置生成
  const stars = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    top: Math.random() * 100,
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 2,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-purple-800 to-pink-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景装飾 - 静的 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl"></div>

        {/* キラキラ星のアニメーション */}
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              animation: `twinkle ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      <div className="relative w-full max-w-md">
        {/* メインコンテンツ */}
        <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/30">
          {/* アイコン - 静的 */}
          <div className="text-center mb-8">
            <div className="text-8xl mb-6 filter drop-shadow-lg">🔮</div>

            <h1 className="text-5xl font-bold bg-gradient-to-r from-sky-200 to-purple-200 bg-clip-text text-transparent mb-4">
              Ai Tarot Chat
            </h1>

            <p className="text-white/80 text-xl font-medium">
              AIと対話するタロット占い
            </p>

            {/* 装飾的な区切り線 */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <div className="w-12 h-px bg-gradient-to-r from-transparent to-white/40"></div>
              <div className="w-2 h-2 bg-white/50 rounded-full"></div>
              <div className="w-12 h-px bg-gradient-to-l from-transparent to-white/40"></div>
            </div>

            {/* メッセージ表示 */}
            {message && (
              <div className="mt-8 text-center text-white/90 text-lg font-semibold">
                {message}
              </div>
            )}
          </div>
        </div>

        {/* サブテキスト */}
        <div className="text-center mt-6 text-white/50 text-sm">
          <p>数千年の叡智と最新AI技術の融合</p>
          <p className="mt-1">あなただけの運命を照らします</p>
        </div>
      </div>
    </div>
  );
};

export default TarotSplashScreen;
