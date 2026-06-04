interface CountdownOverlayProps {
  number: number;
}

export default function CountdownOverlay({ number }: CountdownOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        key={number}
        className="text-[6rem] sm:text-[8rem] md:text-[12rem] font-black text-white animate-bounce-in"
        style={{ textShadow: '0 0 60px rgba(168, 85, 247, 0.8), 0 0 120px rgba(168, 85, 247, 0.4)' }}
      >
        {number}
      </div>
    </div>
  );
}
