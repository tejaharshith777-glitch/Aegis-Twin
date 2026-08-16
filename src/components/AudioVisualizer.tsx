import React, { useEffect, useState } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  isListening?: boolean;
  barCount?: number;
  height?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isActive,
  isListening = false,
  barCount = 18,
  height = 28,
}) => {
  const [heights, setHeights] = useState<number[]>(() => Array(barCount).fill(15));

  useEffect(() => {
    if (!isActive) {
      setHeights(Array(barCount).fill(15));
      return;
    }

    const interval = setInterval(() => {
      setHeights(
        Array.from({ length: barCount }, (_, index) => {
          // Create a wave pattern with organic jitter
          const base = isListening ? 45 : 60;
          const variance = Math.sin(Date.now() / 150 + index * 0.4) * 30;
          const jitter = (Math.random() - 0.5) * 35;
          const val = Math.max(12, Math.min(100, base + variance + jitter));
          return val;
        })
      );
    }, 60);

    return () => clearInterval(interval);
  }, [isActive, isListening, barCount]);

  return (
    <div
      className={`audio-visualizer ${isActive ? 'active' : ''} ${isListening ? 'listening' : ''}`}
      style={{ height: `${height}px` }}
      aria-hidden="true"
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className="visualizer-bar"
          style={{
            height: isActive ? `${h}%` : '15%',
            animationDelay: `${i * 35}ms`,
          }}
        />
      ))}
    </div>
  );
};
