interface CountdownOverlayProps {
  number: number;
}

export default function CountdownOverlay({ number }: CountdownOverlayProps) {
  const circumference = 2 * Math.PI * 70;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
      <div className="relative animate-bounce-in">
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 180 180"
          style={{ filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.6))' }}
        >
          <circle
            cx="90"
            cy="90"
            r="70"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="6"
          />
          <circle
            cx="90"
            cy="90"
            r="70"
            fill="none"
            stroke="url(#countdownGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - number / 3)}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
          <defs>
            <linearGradient id="countdownGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
        <div
          className="w-[180px] h-[180px] flex items-center justify-center text-[5rem] sm:text-[6rem] font-black text-white"
          style={{ textShadow: '0 0 40px rgba(168, 85, 247, 0.8), 0 0 80px rgba(168, 85, 247, 0.3)' }}
        >
          {number}
        </div>
      </div>
    </div>
  );
}
