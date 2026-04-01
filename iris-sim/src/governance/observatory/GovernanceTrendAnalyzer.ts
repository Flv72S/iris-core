/**
 * Step 7E — Governance Observatory. Trend analyzer (deterministic).
 */

const TREND_THRESHOLD = 0.05;
const ACCELERATION_WINDOW = 3;

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function slope(series: number[]): number {
  if (series.length < 2) return 0;
  const n = series.length;
  const xMean = (n - 1) / 2;
  const yMean = mean(series);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (series[i]! - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export class GovernanceTrendAnalyzer {
  detectTrend(metricSeries: number[]): 'rising' | 'falling' | 'stable' {
    if (metricSeries.length < 2) return 'stable';
    const s = slope(metricSeries);
    if (s > TREND_THRESHOLD) return 'rising';
    if (s < -TREND_THRESHOLD) return 'falling';
    return 'stable';
  }

  detectAcceleration(metricSeries: number[]): boolean {
    if (metricSeries.length < ACCELERATION_WINDOW + 1) return false;
    const firstSlope = slope(metricSeries.slice(0, ACCELERATION_WINDOW));
    const lastSlope = slope(
      metricSeries.slice(metricSeries.length - ACCELERATION_WINDOW - 1)
    );
    return Math.abs(lastSlope - firstSlope) > TREND_THRESHOLD;
  }

  detectInstability(metricSeries: number[]): boolean {
    if (metricSeries.length < 3) return false;
    const std =
      Math.sqrt(
        metricSeries.reduce((s, x) => {
          const m = mean(metricSeries);
          return s + (x - m) ** 2;
        }, 0) / metricSeries.length
      ) ?? 0;
    return std > 0.15;
  }

  detectStabilization(metricSeries: number[]): boolean {
    if (metricSeries.length < 6) return false;
    const half = Math.floor(metricSeries.length / 2);
    const firstHalf = metricSeries.slice(0, half);
    const secondHalf = metricSeries.slice(half);
    const std1 =
      Math.sqrt(
        firstHalf.reduce((s, x) => {
          const m = mean(firstHalf);
          return s + (x - m) ** 2;
        }, 0) / firstHalf.length
      ) ?? 0;
    const std2 =
      Math.sqrt(
        secondHalf.reduce((s, x) => {
          const m = mean(secondHalf);
          return s + (x - m) ** 2;
        }, 0) / secondHalf.length
      ) ?? 0;
    return std2 < std1 * 0.7;
  }
}
