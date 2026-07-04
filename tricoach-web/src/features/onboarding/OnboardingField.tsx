import type { ReactNode } from 'react';

/** Shared label+control row used across every onboarding step — port of TriCoachAI's OnboardingField. */
export function OnboardingField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1 rounded-control bg-card-background p-2">
      <p className="text-sm text-secondary-text">{label}</p>
      {children}
    </div>
  );
}
