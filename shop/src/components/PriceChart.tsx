import { formatPrice } from "@/lib/data";

// Lowest price across shops over time: one series, so no legend; each point has a hover tooltip.
export function PriceChart({ series }: { series: [string, number][] }) {
  if (series.length < 2) {
    return <p className="text-sm text-ink-3">Price history builds up as prices are collected each day.</p>;
  }
  const W = 600, H = 180, PAD = { l: 56, r: 12, t: 12, b: 28 };
  const prices = series.map(([, p]) => p);
  const min = Math.min(...prices), max = Math.max(...prices);
  const span = max - min || max * 0.1 || 1;
  const lo = min - span * 0.15, hi = max + span * 0.15;
  const x = (i: number) => PAD.l + (i / (series.length - 1)) * (W - PAD.l - PAD.r);
  const y = (p: number) => PAD.t + (1 - (p - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const path = series.map(([, p], i) => `${i ? "L" : "M"}${x(i)},${y(p)}`).join(" ");
  const ticks = [lo + (hi - lo) * 0.2, (lo + hi) / 2, hi - (hi - lo) * 0.2];
  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "short" });

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Lowest price over time">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--ink-3)">
              {formatPrice(t)}
            </text>
          </g>
        ))}
        <text x={PAD.l} y={H - 8} fontSize={11} fill="var(--ink-3)">{fmtDate(series[0][0])}</text>
        <text x={W - PAD.r} y={H - 8} textAnchor="end" fontSize={11} fill="var(--ink-3)">
          {fmtDate(series.at(-1)![0])}
        </text>
        <path d={path} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" />
        {series.map(([d, p], i) => (
          <g key={d}>
            <circle cx={x(i)} cy={y(p)} r={4} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
            <circle cx={x(i)} cy={y(p)} r={12} fill="transparent">
              <title>{`${fmtDate(d)}: ${formatPrice(p)}`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <details className="mt-1 text-xs text-ink-2">
        <summary className="cursor-pointer">Show as table</summary>
        <table className="mt-1">
          <tbody>
            {series.map(([d, p]) => (
              <tr key={d}>
                <td className="pr-4">{fmtDate(d)}</td>
                <td>{formatPrice(p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
