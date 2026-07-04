interface ProgressRingProps {
  /** 0...1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  tint?: string;
}

/** Port of TriCoachAI/Core/DesignSystem/ProgressRingView.swift. */
export function ProgressRing({ progress, size = 64, strokeWidth = 8, tint = 'var(--color-brand)' }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const dashOffset = circumference * (1 - clamped);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="presentation" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={tint} strokeOpacity={0.15} strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={tint}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
      />
    </svg>
  );
}
