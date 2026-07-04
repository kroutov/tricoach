import type { ReactNode } from 'react';

/** Port of TriCoachAI/Core/DesignSystem/CardView.swift. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card bg-card-background p-4 ${className}`}>{children}</div>;
}
