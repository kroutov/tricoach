/** Port of TriCoachAI/Core/DesignSystem/PillBadge.swift. `tint` is any valid CSS color (hex or `var(--...)`). */
export function PillBadge({ text, tint }: { text: string; tint: string }) {
  return (
    <span
      className="rounded-pill px-2 py-1 text-xs font-semibold"
      style={{ backgroundColor: `color-mix(in srgb, ${tint} 15%, transparent)`, color: tint }}
    >
      {text}
    </span>
  );
}
