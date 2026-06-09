import { useRef, useEffect } from 'react';

interface ScoreChartProps {
  data: [number, number][];
  myName?: string;
  opponentName?: string;
}

export default function ScoreChart({ data, myName = '你', opponentName = '对手' }: ScoreChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padTop = 16;
    const padBottom = 24;
    const padLeft = 28;
    const padRight = 16;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    ctx.clearRect(0, 0, w, h);
    if (data.length < 2) return;

    const maxVal = Math.max(...data.flat(), 1);

    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + chartW, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (chartH / 4) * i;
      const val = Math.round(maxVal - (maxVal / 4) * i);
      ctx.fillText(String(val), padLeft - 4, y + 3);
    }

    const drawLine = (points: number[], color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      points.forEach((val, i) => {
        const x = padLeft + (chartW / (data.length - 1)) * i;
        const y = padTop + chartH - (val / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    drawLine(data.map(d => d[0]), '#8B5CF6');
    drawLine(data.map(d => d[1]), '#EC4899');

    const drawEndDot = (points: number[], color: string) => {
      const lastVal = points[points.length - 1];
      const x = padLeft + chartW;
      const y = padTop + chartH - (lastVal / maxVal) * chartH;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    };
    drawEndDot(data.map(d => d[0]), '#8B5CF6');
    drawEndDot(data.map(d => d[1]), '#EC4899');
  }, [data]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-4 mb-2 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-purple-500 rounded" />
          <span className="text-gray-500">{myName}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-pink-500 rounded" />
          <span className="text-gray-500">{opponentName}</span>
        </span>
      </div>
      <canvas ref={canvasRef} className="w-full" style={{ height: 160 }} />
    </div>
  );
}
