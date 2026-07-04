import { AthleteProfile, Range } from './types';

/** Karvonen heart-rate reserve zone bounds — mirrors `AthleteProfile.heartRateZone` in Swift. */
export function heartRateZone(profile: AthleteProfile, zone: number): Range<number> | undefined {
  if (profile.hrMax == null || profile.hrRest == null) return undefined;
  const bounds: [number, number][] = [
    [0.5, 0.6],
    [0.6, 0.7],
    [0.7, 0.8],
    [0.8, 0.9],
    [0.9, 1.0],
  ];
  if (zone < 1 || zone > bounds.length) return undefined;
  const reserve = profile.hrMax - profile.hrRest;
  const [lowPct, highPct] = bounds[zone - 1]!;
  return {
    lowerBound: Math.round(profile.hrRest + reserve * lowPct),
    upperBound: Math.round(profile.hrRest + reserve * highPct),
  };
}
