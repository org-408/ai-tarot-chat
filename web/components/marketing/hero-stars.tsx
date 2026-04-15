"use client";

// 決定論的な位置（Math.random()はハイドレーション不一致を起こすため使わない）
const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  top: ((i * 37 + 7) % 97) + 1.5,
  left: ((i * 61 + 13) % 97) + 1.5,
  delay: (i * 0.17) % 3,
  duration: 2 + (i * 0.11) % 2,
  size: i % 5 === 0 ? 2 : 1,
}));

export function HeroStars() {
  return (
    <>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      {STARS.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: star.size,
            height: star.size,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
    </>
  );
}
